# FILE: app/services/voidai_service.py
import httpx
import asyncio
import time
import random
import json
from typing import List, Dict, Any, Optional, AsyncGenerator
from httpx import Headers

from app.core.config import settings, VOIDAI_API_KEYS_LIST, AVAILABLE_MODELS_DICT, NON_STREAMING_MODELS_SET

RPM_LIMIT = 5
RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_LOCKOUT_SECONDS = 65
MODELS_REQUIRING_MAX_COMPLETION_TOKENS = {"o3-high", "o4-mini-high"}
MODEL_MAX_OUTPUT_TOKENS = {
    "gemini-2.5-pro-preview-03-25": 65536,
    "o3-high": 100000,
    "o4-mini-high": 100000,
    "grok-3": 8196,
    "gpt-4.1": 32768,
    "chatgpt-4o-latest": 16384,
}
DEFAULT_MAX_OUTPUT_TOKENS = 8196

api_keys_state: List[Dict[str, Any]] = []
key_state_lock = asyncio.Lock()

def initialize_key_state():
    global api_keys_state
    if not VOIDAI_API_KEYS_LIST:
        print("ПРЕДУПРЕЖДЕНИЕ: Список API ключей пуст, сервис VoidAI не сможет работать.")
        api_keys_state = []
        return

    print(f"--- (Пере)Инициализация состояния для {len(VOIDAI_API_KEYS_LIST)} API ключей VoidAI ---")
    current_time = time.time()
    new_state = []
    for key in VOIDAI_API_KEYS_LIST:
        new_state.append({
            "key": key,
            "requests_timestamps": [],
            "is_rate_limited": False,
            "rate_limit_until": 0,
            "is_invalid": False,
        })
    api_keys_state = new_state
    print(f"Состояние для {len(api_keys_state)} ключей инициализировано.")

initialize_key_state()

async_client = httpx.AsyncClient(
    base_url=settings.voidai_base_url,
    timeout=90.0
)

async def get_available_api_key() -> Optional[str]:
    global api_keys_state
    if not api_keys_state:
        print("ОШИБКА: Состояние API ключей пустое!")
        return None

    async with key_state_lock:
        current_time = time.time()
        available_keys_info = []

        for key_info in api_keys_state:
            if key_info.get("is_invalid", False): continue
            if key_info["is_rate_limited"]:
                if current_time < key_info["rate_limit_until"]: continue
                else:
                    key_info["is_rate_limited"] = False
                    key_info["rate_limit_until"] = 0
                    key_info["requests_timestamps"] = [
                        ts for ts in key_info["requests_timestamps"]
                        if current_time - ts < RATE_LIMIT_WINDOW_SECONDS
                    ]
            valid_timestamps = [
                ts for ts in key_info["requests_timestamps"]
                if current_time - ts < RATE_LIMIT_WINDOW_SECONDS
            ]
            key_info["requests_timestamps"] = valid_timestamps
            recent_request_count = len(valid_timestamps)
            if recent_request_count < RPM_LIMIT:
                available_keys_info.append((key_info, recent_request_count))

        if not available_keys_info:
            print(f"ПРЕДУПРЕЖДЕНИЕ: Нет доступных ключей. Всего ключей: {len(api_keys_state)}. Проверьте лимиты и состояние ключей.")
            return None

        available_keys_info.sort(key=lambda x: x[1])
        min_requests = available_keys_info[0][1]
        best_candidates = [k_info for k_info, count in available_keys_info if count == min_requests]
        chosen_key_info = random.choice(best_candidates)
        chosen_key_info["requests_timestamps"].append(current_time)
        selected_key = chosen_key_info["key"]
        return selected_key

async def get_ai_response(
    model: str,
    messages: List[Dict[str, str]],
    max_initial_key_retries: int = 3,
    max_api_call_retries: int = 5,
    retry_delay: float = 0.5
) -> Dict[str, Any]:
    """
    Отправляет НЕСТРИМИНГОВЫЙ запрос к VoidAI /chat/completions.
    Возвращает полный ответ как словарь.
    """
    print("-" * 40)
    print(f"[API Call - NON-STREAMING] Модель: '{model}', Сообщений: {len(messages)}")

    if model not in AVAILABLE_MODELS_DICT:
        print(f"[API ERROR] Модель '{model}' недоступна.")
        print("-" * 40)
        return {"error_type": "invalid_model", "message": f"Модель '{model}' недоступна.", "status_code": 400}

    max_tokens_value = MODEL_MAX_OUTPUT_TOKENS.get(model, DEFAULT_MAX_OUTPUT_TOKENS)
    max_tokens_param_name = "max_completion_tokens" if model in MODELS_REQUIRING_MAX_COMPLETION_TOKENS else "max_tokens"
    print(f"[API Setup] Параметр '{max_tokens_param_name}'={max_tokens_value}")

    for api_attempt in range(max_api_call_retries):
        print(f"[API Call] Попытка {api_attempt + 1}/{max_api_call_retries}")
        api_key = await get_available_api_key()

        if not api_key:
            print(f"[API WARNING] Ключ не получен на API попытке {api_attempt + 1}.")
            if api_attempt == max_api_call_retries - 1:
                print("-" * 40)
                return {"error_type": "no_available_keys", "message": "Нет доступных API ключей.", "status_code": 503}
            await asyncio.sleep(retry_delay * 2)
            continue

        headers = Headers({"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}, encoding="utf-8")
        payload = {
            "model": model,
            "messages": messages,
            max_tokens_param_name: max_tokens_value,
        }
        request_url = f"{settings.voidai_base_url}/chat/completions"

        try:
            response = await async_client.post(request_url, headers=headers, json=payload)
            if response.is_success:
                try:
                    response_data_ok = response.json()
                    print("-" * 40)
                    return response_data_ok
                except json.JSONDecodeError:
                    print("[API ERROR] Успешный статус, но тело ответа не JSON.")
                    print(f"[API Raw Body]: {response.text}")
                    print("-" * 40)
                    return {"error_type": "internal_error", "message": "API вернул невалидный JSON.", "status_code": 500 }
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            status_code = e.response.status_code
            error_body_text = e.response.text
            detail = error_body_text
            error_json = None
            try:
                error_json = e.response.json()
                if isinstance(error_json, dict):
                    detail_from_json = error_json.get("error", {}).get("message")
                    if not detail_from_json: detail_from_json = error_json.get("detail")
                    if detail_from_json: detail = str(detail_from_json)
                    else: detail = json.dumps(error_json)
            except json.JSONDecodeError:
                pass
            print(f"[API ERROR] HTTP Status {status_code} (Ключ: {api_key[:8]}...). Detail: {detail[:250]}...")
            if status_code == 401:
                print(f"[API Key Invalid] Помечаем ключ {api_key[:8]}... как невалидный.")
                async with key_state_lock:
                    for key_info in api_keys_state:
                        if key_info["key"] == api_key: key_info["is_invalid"] = True; break
                print("-" * 40)
                return {"error_type": "invalid_key", "message": "Ключ API невалиден.", "status_code": status_code}
            elif status_code == 429 or ("rate limit" in detail.lower() or "too many requests" in detail.lower()):
                print(f"[API Rate Limit] Ошибка {status_code} для ключа {api_key[:8]}... Блокируем на {RATE_LIMIT_LOCKOUT_SECONDS} сек.")
                async with key_state_lock:
                    current_time = time.time()
                    for key_info in api_keys_state:
                        if key_info["key"] == api_key:
                            key_info["is_rate_limited"] = True
                            key_info["rate_limit_until"] = current_time + RATE_LIMIT_LOCKOUT_SECONDS
                            key_info["requests_timestamps"] = []
                            break
                if api_attempt < max_api_call_retries - 1:
                    print(f"[API Retry] Повторная попытка {api_attempt + 2}/{max_api_call_retries} из-за Rate Limit...")
                    await asyncio.sleep(retry_delay * (api_attempt + 1))
                    continue
                else:
                    print(f"[API ERROR] Превышен лимит попыток ({max_api_call_retries}) после Rate Limit.")
                    print("-" * 40)
                    return {"error_type": "rate_limit_final", "message": "Rate Limit превышен.", "status_code": status_code}
            elif status_code == 400:
                print(f"[API ERROR] HTTP 400 Bad Request. Не повторяем.")
                print("-" * 40)
                return {"error_type": "api_error", "message": f"Ошибка API ({status_code}): {detail}", "status_code": status_code}
            elif status_code == 500:
                 print(f"[API ERROR] HTTP 500 Internal Server Error от VoidAI. Не повторяем.")
                 print("-" * 40)
                 return {"error_type": "api_error", "message": f"Внутренняя ошибка сервера VoidAI ({status_code}): {detail}", "status_code": status_code}
            else:
                print(f"[API ERROR] Необработанная ошибка HTTP {status_code}. Не повторяем.")
                print("-" * 40)
                return {"error_type": "api_error", "message": f"Ошибка API VoidAI ({status_code}): {detail}", "status_code": status_code}
        except httpx.RequestError as e:
            print(f"[Network ERROR] Ошибка при запросе к {e.request.url!r}: {e}")
            if api_attempt < max_api_call_retries - 1:
                 print(f"[API Retry] Повторная попытка {api_attempt + 2}/{max_api_call_retries} из-за сетевой ошибки...")
                 await asyncio.sleep(retry_delay * (api_attempt + 1) * 2)
                 continue
            else:
                 print(f"[API ERROR] Превышен лимит попыток ({max_api_call_retries}) после сетевой ошибки.")
                 print("-" * 40)
                 return {"error_type": "network_error", "message": f"Сетевая ошибка: {e}", "status_code": 504}
        except Exception as e:
             print(f"[Unexpected ERROR] Непредвиденная ошибка: {type(e).__name__} - {e}")
             import traceback
             traceback.print_exc()
             print("-" * 40)
             return {"error_type": "internal_error", "message": f"Непредвиденная ошибка: {e}", "status_code": 500}

    print("[API FATAL - NON-STREAMING] Цикл API ретраев завершился неожиданно.")
    print("-" * 40)
    return {"error_type": "internal_error", "message": "Не удалось получить ответ от AI после всех попыток.", "status_code": 500}

async def stream_ai_response(
    model: str,
    messages: List[Dict[str, str]],
    max_initial_key_retries: int = 3,
    max_api_call_retries: int = 5,
    retry_delay: float = 0.3
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Отправляет СТРИМИНГОВЫЙ запрос к VoidAI /chat/completions.
    Асинхронно генерирует (yield) словари с данными из каждого SSE чанка.
    В случае ошибки генерирует словарь с ключом 'error_type'.
    """
    print("-" * 40)
    print(f"[API Call - STREAMING] Модель: '{model}', Сообщений: {len(messages)}")

    max_tokens_value = MODEL_MAX_OUTPUT_TOKENS.get(model, DEFAULT_MAX_OUTPUT_TOKENS)
    max_tokens_param_name = "max_completion_tokens" if model in MODELS_REQUIRING_MAX_COMPLETION_TOKENS else "max_tokens"
    print(f"[API Setup STREAM] Параметр '{max_tokens_param_name}'={max_tokens_value}")

    payload = {
        "model": model,
        "messages": messages,
        max_tokens_param_name: max_tokens_value,
        "stream": True
    }
    request_url = f"{settings.voidai_base_url}/chat/completions"

    # Внешний цикл для повторных попыток при rate limit
    for api_attempt in range(max_api_call_retries):
        print(f"[API STREAM] Попытка {api_attempt + 1}/{max_api_call_retries}")
        
        api_key = await get_available_api_key()
        if not api_key:
            print(f"[API STREAM WARNING] Ключ не получен на API попытке {api_attempt + 1}.")
            if api_attempt == max_api_call_retries - 1:
                print("[API STREAM ERROR] Нет доступных ключей после всех попыток.")
                yield {"error_type": "no_available_keys", "message": "Нет доступных API ключей для стриминга.", "status_code": 503}
                print("-" * 40)
                return
            await asyncio.sleep(retry_delay * 2)
            continue

        headers = Headers({"Authorization": f"Bearer {api_key}", "Content-Type": "application/json", "Accept": "text/event-stream"}, encoding="utf-8")
        response = None

        try:
            async with async_client.stream("POST", request_url, headers=headers, json=payload) as response:
                print(f"[API STREAM] Статус ответа: {response.status_code}")

                if not response.is_success:
                    error_body_text = await response.aread()
                    detail = error_body_text.decode('utf-8', errors='replace')
                    status_code = response.status_code
                    error_json = None
                    try:
                        error_json = json.loads(detail)
                        if isinstance(error_json, dict):
                            detail_from_json = error_json.get("error", {}).get("message", error_json.get("detail"))
                            if detail_from_json: detail = str(detail_from_json)
                            else: detail = json.dumps(error_json)
                    except json.JSONDecodeError:
                        pass
                    print(f"[API STREAM ERROR] HTTP Status {status_code} (Ключ: {api_key[:8]}...). Detail: {detail[:250]}...")
                    if status_code == 401:
                        async with key_state_lock:
                            for key_info in api_keys_state:
                                if key_info["key"] == api_key: key_info["is_invalid"] = True; break
                        yield {"error_type": "invalid_key", "message": "Ключ API невалиден.", "status_code": status_code}
                        print("-" * 40)
                        return
                    elif status_code == 429 or ("rate limit" in detail.lower() or "too many requests" in detail.lower()):
                        print(f"[API STREAM Rate Limit] Ошибка {status_code} для ключа {api_key[:8]}... Блокируем на {RATE_LIMIT_LOCKOUT_SECONDS} сек.")
                        async with key_state_lock:
                            current_time = time.time()
                            for key_info in api_keys_state:
                                if key_info["key"] == api_key:
                                    key_info["is_rate_limited"] = True
                                    key_info["rate_limit_until"] = current_time + RATE_LIMIT_LOCKOUT_SECONDS
                                    key_info["requests_timestamps"] = []
                                    break
                        
                        # Если есть еще попытки, продолжаем
                        if api_attempt < max_api_call_retries - 1:
                            print(f"[API STREAM Retry] Повторная попытка {api_attempt + 2}/{max_api_call_retries} из-за Rate Limit...")
                            await asyncio.sleep(retry_delay * (api_attempt + 1))
                            continue  # Переходим к следующей итерации цикла
                        else:
                            print(f"[API STREAM ERROR] Превышен лимит попыток ({max_api_call_retries}) после Rate Limit.")
                            yield {"error_type": "rate_limit_final", "message": "Rate Limit во время стриминга.", "status_code": status_code}
                            print("-" * 40)
                            return
                    else:
                        yield {"error_type": "api_error", "message": f"Ошибка API ({status_code}): {detail}", "status_code": status_code}
                        print("-" * 40)
                        return

                # Если успешный ответ, читаем стрим
                async for line in response.aiter_lines():
                    if line.startswith("data:"):
                        data_content = line[len("data: "):].strip()
                        if data_content == "[DONE]":
                            break
                        try:
                            chunk_data = json.loads(data_content)
                            yield chunk_data
                        except json.JSONDecodeError:
                            print(f"[API STREAM WARNING] Не удалось декодировать JSON из строки: {data_content}")
                    elif line.strip():
                         print(f"[API STREAM INFO] Получена не 'data:' строка: {line}")
                
                # Если дошли сюда, значит стрим успешно завершен
                print("-" * 40)
                return

        except httpx.RequestError as e:
            print(f"[API STREAM Network ERROR] Ошибка при запросе к {e.request.url!r}: {e}")
            if api_attempt < max_api_call_retries - 1:
                print(f"[API STREAM Retry] Повторная попытка {api_attempt + 2}/{max_api_call_retries} из-за сетевой ошибки...")
                await asyncio.sleep(retry_delay * (api_attempt + 1) * 2)
                continue
            else:
                yield {"error_type": "network_error", "message": f"Сетевая ошибка стриминга: {e}", "status_code": 504}
                print("-" * 40)
                return
        except httpx.StreamError as e:
            print(f"[API STREAM Error] Ошибка во время чтения стрима: {e}")
            if api_attempt < max_api_call_retries - 1:
                print(f"[API STREAM Retry] Повторная попытка {api_attempt + 2}/{max_api_call_retries} из-за ошибки стрима...")
                await asyncio.sleep(retry_delay * (api_attempt + 1))
                continue
            else:
                status_code = response.status_code if response and not response.is_closed else 503
                yield {"error_type": "stream_error", "message": f"Ошибка чтения стрима: {e}", "status_code": status_code}
                print("-" * 40)
                return
        except Exception as e:
            print(f"[API STREAM Unexpected ERROR] Непредвиденная ошибка: {type(e).__name__} - {e}")
            import traceback
            traceback.print_exc()
            yield {"error_type": "internal_error", "message": f"Непредвиденная ошибка стриминга: {e}", "status_code": 500}
            print("-" * 40)
            return
    
    # Если мы дошли сюда, значит все попытки исчерпаны
    print("[API STREAM FATAL] Все попытки исчерпаны без успешного стрима")
    print("-" * 40)

async def close_client():
    await async_client.aclose()
    print("--- HTTP клиент для VoidAI закрыт ---")