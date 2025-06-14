// Файл: app/static/js/main.js
// ВЕРСИЯ С ИСПРАВЛЕНИЯМИ ОТОБРАЖЕНИЯ СООБЩЕНИЙ ЮЗЕРА И ОСТАНОВКИ ГЕНЕРАЦИИ

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOMContentLoaded: Начало инициализации приложения");
    
    // Проверка загрузки критических библиотек
    if (typeof feather === 'undefined') {
        console.error("КРИТИЧЕСКАЯ ОШИБКА: Feather icons не загружены!");
    } else {
        try {
            feather.replace({
                width: '1em',
                height: '1em',
                'stroke-width': 2
            });
            console.log("Feather icons инициализированы успешно");
        } catch (e) {
            console.error("Feather icons script not loaded or failed:", e);
        }
    }
    
    if (typeof marked === 'undefined') {
        console.error("ПРЕДУПРЕЖДЕНИЕ: Marked.js не загружен, markdown рендеринг будет недоступен");
    }

    // --- Глобальные переменные состояния ---
    let currentChatId = null; // ID постоянного чата (или null)
    let isLoading = false; // Общая загрузка (например, загрузка истории)
    let isGeneratingResponse = false; // Идет генерация ответа AI
    let stopGenerationRequested = false; // Запрошена остановка генерации
    let availableModels = {};
    let currentModelId = null;
    let isTempChat = false; // Флаг режима "Инкогнито"
    let temporaryChatHistory = []; // Массив для истории сообщений в режиме инкогнито [{ tempId, role, content }, ...]
    let searchableChatList = [];
    let loadingIndicatorElement = null; // Ссылка на DOM элемент индикатора
    let loadingTextTimeoutId = null; // ID таймера для текста "Модель думает..."
    let currentAbortController = null;
    const genericErrorMessage = "Произошла ошибка. Попробуйте еще раз."; // Стандартное сообщение об ошибке
    let currentSystemInstructions = '';
    let isStreamingEnabled = true; // Флаг для включения/выключения стриминга

    // --- Ссылки на элементы DOM ---
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const modelSelectorButton = document.getElementById('model-selector-button');
    const modelPopup = document.getElementById('model-selection-popup');
    const currentModelNameSpan = document.getElementById('current-model-name');
    const modelListUl = document.getElementById('model-list-ul');
    const tempChatCheckbox = document.getElementById('temp-chat-checkbox');
    const chatMessagesContainer = document.getElementById('chat-messages'); // Контейнер *для* сообщений
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const emptyChatPlaceholder = document.getElementById('empty-chat-placeholder');
    const chatArea = document.getElementById('chat-area'); // <--- ЭТОТ ЭЛЕМЕНТ СКРОЛЛИТСЯ
    const chatListElement = document.getElementById('chat-history-list');
    const newChatButton = document.getElementById('new-chat-btn');
    const appContainer = document.querySelector('.app-container'); // Получаем главный контейнер
    const desktopSidebarToggle = document.getElementById('desktop-sidebar-toggle'); // Новая кнопка
    const desktopToggleIcon = desktopSidebarToggle?.querySelector('i[data-feather]'); // Иконка внутри кнопки
    const openSidebarBtn = document.getElementById('open-sidebar-btn');
    const openSidebarBtnIcon = openSidebarBtn?.querySelector('i[data-feather]');
    const CHAT_SEARCH_POPUP_ID = 'chat-search-popup';
    const CHAT_SEARCH_OVERLAY_ID = 'chat-search-overlay';
    // НОВОЕ: Ссылки на элементы модального окна настроек
    const settingsBtn = document.getElementById('settings-btn');
    const settingsMenu = document.getElementById('settings-menu');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const systemPromptBtn = document.getElementById('system-prompt-btn');
    const streamingToggle = document.getElementById('streaming-toggle');
    const settingsModal = document.getElementById('settings-modal');
    const settingsOverlay = document.getElementById('settings-modal-overlay');
    const systemInstructionsTextarea = document.getElementById('system-instructions-textarea');
    const saveInstructionsBtn = document.getElementById('save-instructions-btn');
    const closeSettingsModalBtn = document.getElementById('close-settings-modal-btn');


    // --- Проверка наличия chatArea ---
    if (!chatArea) {
        console.error("Критическая ошибка: элемент #chat-area не найден! Скролл не будет работать.");
    }
    if (!chatMessagesContainer) {
        console.error("Критическая ошибка: элемент #chat-messages не найден!");
    }

// --- Загрузка настроек из localStorage ---
const loadSystemInstructions = () => {
    currentSystemInstructions = localStorage.getItem('systemInstructions') || '';
    if (settingsBtn) {
        settingsBtn.classList.toggle('has-instructions', !!currentSystemInstructions);
        settingsBtn.title = 'Настройки';
    }
    // Не предзаполняем textarea здесь, сделаем это при открытии
    console.log("System instructions loaded:", currentSystemInstructions ? currentSystemInstructions.substring(0, 50)+'...' : '<empty>');
};

// --- Загрузка настроек стриминга ---
const loadStreamingSettings = () => {
    const savedStreaming = localStorage.getItem('streamingEnabled');
    isStreamingEnabled = savedStreaming !== null ? savedStreaming === 'true' : true;
    if (streamingToggle) {
        streamingToggle.checked = isStreamingEnabled;
    }
    console.log("Streaming settings loaded:", isStreamingEnabled);
};

// --- Открытие меню настроек ---
const openSettingsMenu = () => {
    if (!settingsMenu) return;
    settingsMenu.classList.remove('hidden');
    // Создаем оверлей для закрытия при клике вне меню
    const overlay = document.createElement('div');
    overlay.className = 'settings-menu-overlay';
    overlay.id = 'settings-menu-overlay';
    overlay.addEventListener('click', closeSettingsMenu);
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.remove('hidden'), 10);
};

// --- Закрытие меню настроек ---
const closeSettingsMenu = () => {
    if (!settingsMenu) return;
    settingsMenu.classList.add('hidden');
    const overlay = document.getElementById('settings-menu-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
        setTimeout(() => overlay.remove(), 300);
    }
};

// --- Открытие модального окна настроек ---
const openSettingsModal = () => {
    if (!settingsModal || !settingsOverlay || !systemInstructionsTextarea) return;
    systemInstructionsTextarea.value = currentSystemInstructions; // Заполняем текущими инструкциями
    settingsModal.classList.remove('hidden');
    settingsOverlay.classList.remove('hidden');
    systemInstructionsTextarea.focus(); // Фокус на поле ввода
};

// --- Закрытие модального окна настроек ---
const closeSettingsModal = () => {
    if (!settingsModal || !settingsOverlay) return;
    settingsModal.classList.add('hidden');
    settingsOverlay.classList.add('hidden');
};

// --- Сохранение инструкций ---
const saveSystemInstructions = () => {
    if (!systemInstructionsTextarea) return;
    const newInstructions = systemInstructionsTextarea.value.trim();
    localStorage.setItem('systemInstructions', newInstructions);
    currentSystemInstructions = newInstructions;
    if (settingsBtn) {
        settingsBtn.classList.toggle('has-instructions', !!currentSystemInstructions);
        settingsBtn.title = currentSystemInstructions ? 'Изменить системные инструкции' : 'Задать системные инструкции';
    }
    console.log("System instructions saved:", currentSystemInstructions ? currentSystemInstructions.substring(0, 50)+'...' : '<empty>');
    closeSettingsModal();
    // Можно добавить уведомление об успешном сохранении
    // alert("Системные инструкции сохранены!");
};


    // Function to close the search popup
const closeChatSearchPopup = () => {
    const popup = document.getElementById(CHAT_SEARCH_POPUP_ID);
    const overlay = document.getElementById(CHAT_SEARCH_OVERLAY_ID);
    if (popup) popup.remove();
    if (overlay) overlay.remove();
    // Remove the click listener when closing
    document.removeEventListener('click', handleClickOutsideSearchPopup, true);
};

// Function to handle clicks outside the search popup
const handleClickOutsideSearchPopup = (event) => {
    const popup = document.getElementById(CHAT_SEARCH_POPUP_ID);
    // Close if click is outside the popup itself
    if (popup && !popup.contains(event.target)) {
        // Optional: Check if the click was on the trigger button to prevent immediate re-opening (might not be needed)
        // const searchButton = document.getElementById('search-chat-btn');
        // if (!searchButton || !searchButton.contains(event.target)) {
        //     closeChatSearchPopup();
        // }
        closeChatSearchPopup();
    }
};


// Function to filter and display search results
const filterAndDisplaySearchResults = (query) => {
    const resultsList = document.getElementById('chat-search-results-list');
    if (!resultsList) return;

    resultsList.innerHTML = ''; // Clear previous results
    const lowerCaseQuery = query.toLowerCase().trim();

    const filteredChats = searchableChatList.filter(chat =>
        chat.title && chat.title.toLowerCase().includes(lowerCaseQuery)
    );

    if (filteredChats.length === 0) {
        resultsList.innerHTML = '<li class="search-no-results">Ничего не найдено</li>';
        return;
    }

    filteredChats.forEach(chat => {
        const li = document.createElement('li');
        li.textContent = chat.title || 'Без названия';
        li.dataset.chatId = chat.id;
        li.addEventListener('click', () => {
            closeChatSearchPopup();
            // Ensure the chat ID is valid before loading
            if (chat.id && chat.id > 0) {
                loadAndDisplayChat(chat.id); // Use existing function to load the chat
            } else {
                console.error("Invalid chat ID found in search result:", chat.id);
            }
        });
        resultsList.appendChild(li);
    });
};

// Function to open the search popup
const openChatSearchPopup = () => {
    // Close any other potential popups first
    closeChatSearchPopup();
    closeAllChatOptionMenus(); // Close chat options menu if open
    const modelPopup = document.getElementById('model-selection-popup');
    if (modelPopup && !modelPopup.classList.contains('hidden')) {
        modelPopup.classList.add('hidden');
        document.getElementById('model-selector-button')?.classList.remove('open');
    }


    // Create Overlay
    const overlay = document.createElement('div');
    overlay.id = CHAT_SEARCH_OVERLAY_ID;
    overlay.className = 'modal-overlay chat-search-overlay'; // Use modal-overlay style + specific class
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) { // Only close if clicking the overlay itself
            closeChatSearchPopup();
        }
    });

    // Create Popup Container
    const popup = document.createElement('div');
    popup.id = CHAT_SEARCH_POPUP_ID;
    popup.className = 'chat-search-popup'; // Add specific class for styling

    // Create Search Input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Поиск по названию чата...';
    searchInput.className = 'chat-search-input';
    searchInput.addEventListener('input', (e) => {
        filterAndDisplaySearchResults(e.target.value);
    });

    // Create Results List
    const resultsList = document.createElement('ul');
    resultsList.id = 'chat-search-results-list';
    resultsList.className = 'chat-search-results-list';

    // Create Close Button (Optional but recommended)
    const closeButton = document.createElement('button');
    closeButton.className = 'icon-button chat-search-close-button';
    closeButton.title = 'Закрыть поиск';
    closeButton.innerHTML = '<i data-feather="x"></i>';
    closeButton.addEventListener('click', closeChatSearchPopup);

    // Assemble Popup
    popup.appendChild(closeButton); // Add close button at the top
    popup.appendChild(searchInput);
    popup.appendChild(resultsList);

    // Append to body
    document.body.appendChild(overlay);
    document.body.appendChild(popup);

    // Initial population and focus
    filterAndDisplaySearchResults(''); // Show all chats initially
    searchInput.focus();
    try { feather.replace({'stroke-width': 2}); } catch(e) {} // Render close icon

    // Add global listener to close when clicking outside
    // Use setTimeout to ensure the click that opened the menu doesn't immediately trigger the close
    setTimeout(() => {
        document.addEventListener('click', handleClickOutsideSearchPopup, true);
    }, 0);
};

// --- Event Listener for the Search Button ---
const searchChatButton = document.getElementById('search-chat-btn');
if (searchChatButton) {
    searchChatButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent triggering other listeners
        openChatSearchPopup();
    });
} else {
    console.error("Кнопка поиска #search-chat-btn не найдена.");
}
// --- End Chat Search Popup Logic ---

// --- Обработчики событий для меню настроек ---
if (settingsBtn) {
    settingsBtn.addEventListener('click', openSettingsMenu);
}
if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', closeSettingsMenu);
}
if (systemPromptBtn) {
    systemPromptBtn.addEventListener('click', () => {
        closeSettingsMenu();
        openSettingsModal(); // Убрана задержка - открываем мгновенно
    });
}
if (streamingToggle) {
    streamingToggle.addEventListener('change', (e) => {
        isStreamingEnabled = e.target.checked;
        localStorage.setItem('streamingEnabled', isStreamingEnabled.toString());
        console.log("Streaming settings saved:", isStreamingEnabled);
    });
}

// --- Обработчики событий для модального окна системных инструкций ---
if (closeSettingsModalBtn) {
    closeSettingsModalBtn.addEventListener('click', closeSettingsModal);
}
if (settingsOverlay) {
    settingsOverlay.addEventListener('click', (e) => {
        if (e.target === settingsOverlay) { // Закрывать только по клику на сам оверлей
            closeSettingsModal();
        }
    });
}
if (saveInstructionsBtn) {
    saveInstructionsBtn.addEventListener('click', saveSystemInstructions);
}

// --- Закрытие меню настроек по Escape ---
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (!settingsMenu?.classList.contains('hidden')) {
            closeSettingsMenu();
        }
    }
});

    // --- Функция для скролла чата вниз ---
    const scrollToBottom = (force = false) => { // Добавили force
        if (!chatArea) return;
        const threshold = 100; // Пиксели от низа для автоскролла
        const isScrolledToBottom = chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight < threshold;

        // Скроллим принудительно или если пользователь был внизу
        if (force || isScrolledToBottom) {
            // Используем requestAnimationFrame для более плавного скролла после обновления DOM
             requestAnimationFrame(() => {
                  chatArea.scrollTop = chatArea.scrollHeight;
             });
             // console.log("Scrolled to bottom.");
        } else {
             // console.log("User scrolled up, not auto-scrolling.");
        }
    };

    // --- Функция для обновления иконки кнопки скрытия ---
    const updateSidebarToggleIcons = (isCollapsed) => {
        if (desktopToggleIcon) {
            const insideIconName = isCollapsed ? 'chevron-right' : 'chevron-left';
            desktopToggleIcon.setAttribute('data-feather', insideIconName);
        }
        if (openSidebarBtnIcon) {
            const headerIconName = isCollapsed ? 'chevron-right' : 'menu';
            openSidebarBtnIcon.setAttribute('data-feather', headerIconName);
        }
        try { feather.replace({'stroke-width': 2}); } catch(e){}
    };

    // --- Показ индикатора загрузки ---
    const showLoadingIndicator = () => {
        if (loadingIndicatorElement || !chatMessagesContainer) return;
        if (emptyChatPlaceholder && !emptyChatPlaceholder.classList.contains('hidden')) {
            emptyChatPlaceholder.classList.add('hidden');
        }
        loadingIndicatorElement = document.createElement('div');
        loadingIndicatorElement.className = 'message-container assistant-message loading-indicator-container';
        const circle = document.createElement('div'); circle.className = 'pulsating-circle';
        const textDiv = document.createElement('div'); textDiv.className = 'loading-text';
        loadingIndicatorElement.appendChild(circle); loadingIndicatorElement.appendChild(textDiv);
        chatMessagesContainer.appendChild(loadingIndicatorElement);
        scrollToBottom(true); // Принудительный скролл при показе индикатора
        clearTimeout(loadingTextTimeoutId);
        loadingTextTimeoutId = setTimeout(() => {
            if (textDiv && loadingIndicatorElement && loadingIndicatorElement.isConnected) { // Проверяем, что элемент еще в DOM
                textDiv.textContent = 'Модель думает, ожидайте...';
                textDiv.style.display = 'block';
                scrollToBottom(true);
            }
        }, 15000);
    };

    // --- Скрытие индикатора загрузки ---
    const hideLoadingIndicator = () => {
        clearTimeout(loadingTextTimeoutId); loadingTextTimeoutId = null;
        if (loadingIndicatorElement) {
            loadingIndicatorElement.remove(); loadingIndicatorElement = null;
        }
        checkAndShowPlaceholder();
    };

    // --- Проверка и показ/скрытие плейсхолдера пустого чата ---
    const checkAndShowPlaceholder = () => {
        if (!chatMessagesContainer || !emptyChatPlaceholder) return;
        // Ищем любой message-container, КРОМЕ индикатора загрузки
        const hasMessages = chatMessagesContainer.querySelector('.message-container:not(.loading-indicator-container)');
        if (!hasMessages) { emptyChatPlaceholder.classList.remove('hidden'); }
        else { emptyChatPlaceholder.classList.add('hidden'); }
    };

    // --- Обновление состояния кнопки отправки/остановки ---
    const updateSendButtonState = () => {
        if (!sendButton || !messageInput) return;
        const isEmpty = messageInput.value.trim() === '';

        let iconName = 'arrow-up';
        let buttonTitle = 'Отправить';
        let isDisabled = false;

        // --- FIX: Упрощенная логика ---
        if (isGeneratingResponse) {
            // Если идет генерация - кнопка СТОП, всегда активна
            iconName = 'square';
            buttonTitle = 'Остановить генерацию';
            isDisabled = false;
        } else {
            // Если генерации НЕТ - кнопка ОТПРАВИТЬ
            iconName = 'arrow-up';
            buttonTitle = 'Отправить';
            // Блокируем, если поле пустое ИЛИ идет другая фоновая загрузка (isLoading)
            isDisabled = isEmpty || isLoading;
        }
        // --- КОНЕЦ FIX ---

        sendButton.disabled = isDisabled;
        sendButton.classList.toggle('stop-icon-active', isGeneratingResponse);
        // Класс disabled применяется только если кнопка заблокирована И это НЕ режим стоп
        sendButton.classList.toggle('disabled', isDisabled && !isGeneratingResponse);

        sendButton.innerHTML = `<i data-feather="${iconName}"></i>`;
        sendButton.title = buttonTitle;
        try { feather.replace({'stroke-width': 2.2}); } catch(err){}
    };


    // --- Вспомогательная функция для создания кнопок действий ---
    const createActionButton = (iconName, title, extraClass = null) => {
        const button = document.createElement('button');
        button.className = 'icon-button message-action-button';
        if (extraClass) button.classList.add(extraClass);
        button.title = title;
        try {
            if (typeof feather !== 'undefined' && feather.icons && feather.icons[iconName]) {
                 button.innerHTML = feather.icons[iconName].toSvg({'stroke-width': 2.2});
            } else {
                 button.innerHTML = `[${iconName}]`;
                 console.warn(`Feather icon "${iconName}" not found or Feather library not loaded.`);
            }
        } catch (e) {
             button.innerHTML = `[${iconName}]`;
             console.error(`Error creating Feather icon "${iconName}":`, e);
        }
        return button;
    };

/**
 * Отображает сообщение в области чата.
 * ВЕРСИЯ С ИСПРАВЛЕНИЕМ canRetry ДЛЯ ОШИБКИ ПЕРВОГО СООБЩЕНИЯ В ПОСТОЯННОМ ЧАТЕ
 *
 * @param {string} content - Текст сообщения.
 * @param {'user' | 'assistant' | 'system'} role - Роль отправителя.
 * @param {number | string | null} [messageId=null] - ID сообщения из БД (для постоянных).
 * @param {number | string | null} [chatId=null] - ID чата из БД (для постоянных).
 * @param {boolean} [isStopNotification=false] - Флаг, если это сообщение об остановке генерации.
 * @param {boolean} [isError=false] - Флаг, если это сообщение об ошибке.
 * @param {string | null} [tempId=null] - Временный ID сообщения (для инкогнито или оптимистичного UI).
 * @returns {HTMLElement | null} - Созданный DOM-элемент сообщения или null в случае ошибки.
 */
const displayMessage = (content, role, messageId = null, chatId = null, isStopNotification = false, isError = false, tempId = null) => {
    // Используем переменные из внешней области видимости: chatMessagesContainer, emptyChatPlaceholder, cancelAllActiveEdits,
    // feather, marked, processCodeBlocks, createActionButton, isLoading, isGeneratingResponse,
    // handleEditMessage, handleDeleteMessage, handleRegenerateMessage, retryLastUserMessage,
    // isTempChat, temporaryChatHistory, scrollToBottom, checkAndShowPlaceholder, currentChatId

    const logPrefix = `displayMessage (role=${role}, tempId=${tempId}, messageId=${messageId}, isError=${isError}):`;

    // --- Basic checks ---
    if (!chatMessagesContainer) {
        console.error(`${logPrefix} CRITICAL - chatMessagesContainer не найден!`);
        return null;
    }
    if (emptyChatPlaceholder && !emptyChatPlaceholder.classList.contains('hidden')) {
        emptyChatPlaceholder.classList.add('hidden');
    }
    if (!isError && !isStopNotification && typeof cancelAllActiveEdits === 'function') {
        cancelAllActiveEdits();
    }

    // --- Create message container ---
    const messageContainer = document.createElement('div');
    const roleClass = (role === 'user') ? 'user-message' : 'assistant-message';
    messageContainer.classList.add('message-container', roleClass);
    if (isStopNotification) messageContainer.classList.add('stop-notification-message');
    if (isError) messageContainer.classList.add('error-message');

    // --- Set dataset IDs ---
    if (messageId !== null && messageId !== undefined && String(messageId).trim() !== '') messageContainer.dataset.messageId = messageId;
    // chatId ставим только если !isTempChat И chatId валиден
    if (!isTempChat && chatId !== null && chatId !== undefined && String(chatId).trim() !== '') messageContainer.dataset.chatId = chatId;
    if (tempId !== null && tempId !== undefined && String(tempId).trim() !== '') messageContainer.dataset.tempId = tempId;

    // --- Create message content element ---
    const messageContentDiv = document.createElement('div');
    let textContentForCopy = content || '';

    // --- Populate content based on role ---
    if (role === 'user') {
        messageContentDiv.classList.add('message-bubble');
        messageContentDiv.textContent = content;
    } else {
        messageContentDiv.classList.add('message-content');
        if (role === 'assistant' && !isError && !isStopNotification) {
             try {
                 if (typeof marked === 'undefined') {
                     messageContentDiv.textContent = content || '';
                 } else {
                     const rawHtml = marked.parse(content || '', { breaks: true, gfm: true });
                     messageContentDiv.innerHTML = rawHtml;
                     
                     // Оборачиваем таблицы через общую функцию
                     if (typeof wrapTables === 'function') {
                         wrapTables(messageContentDiv);
                     }
                     
                     if (typeof processCodeBlocks === 'function') processCodeBlocks(messageContentDiv);
                 }
             } catch (e) {
                 console.error(`${logPrefix} Ошибка рендеринга Markdown:`, e);
                 messageContentDiv.textContent = content || '';
             }
        } else {
            messageContentDiv.textContent = content || '';
        }
    }
    messageContainer.appendChild(messageContentDiv);

    // --- Action Buttons ---
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'message-actions';
    let addedButton = false;

    // --- Copy Button ---
    if ((role === 'user' || role === 'assistant') && !isError && !isStopNotification && typeof createActionButton === 'function') {
        const copyButton = createActionButton('copy', 'Копировать');
        if (copyButton) {
             copyButton.addEventListener('click', (e) => {
                 e.stopPropagation();
                 navigator.clipboard.writeText(textContentForCopy).then(() => {
                     if (typeof feather !== 'undefined' && feather.icons['check']) {
                         copyButton.innerHTML = feather.icons['check'].toSvg({'stroke-width': 2.2, 'class': 'copy-success-icon'});
                         setTimeout(() => { if (copyButton.isConnected && feather.icons['copy']) { try { copyButton.innerHTML = feather.icons['copy'].toSvg({'stroke-width': 2.2}); } catch (feError) {} } }, 1500);
                     }
                 }).catch(err => console.error(`${logPrefix} Ошибка копирования:`, err));
             });
             actionsContainer.appendChild(copyButton); addedButton = true;
        }
    }

    // --- User Message Actions ---
    if (role === 'user' && !isError && !isStopNotification && typeof createActionButton === 'function') {
        const editButton = createActionButton('edit-2', 'Изменить');
        if (editButton) {
             editButton.addEventListener('click', (e) => { e.stopPropagation(); if (!isLoading && !isGeneratingResponse) handleEditMessage(messageContainer); else console.log("Edit ignored: operation in progress."); });
             actionsContainer.appendChild(editButton); addedButton = true;
        }
        const deleteButtonUser = createActionButton('trash-2', 'Удалить сообщение', 'delete-message-btn');
        if (deleteButtonUser) {
             deleteButtonUser.addEventListener('click', (e) => { e.stopPropagation(); if (!isLoading && !isGeneratingResponse) handleDeleteMessage(messageContainer); else console.log("Delete ignored: operation in progress."); });
             actionsContainer.appendChild(deleteButtonUser); addedButton = true;
        }
    }
    // --- Assistant Message Actions ---
    else if (role === 'assistant' && !isError && !isStopNotification && typeof createActionButton === 'function') {
        const regenerateButton = createActionButton('refresh-cw', 'Регенерировать ответ', 'regenerate-message-btn');
        if (regenerateButton) {
            regenerateButton.addEventListener('click', (e) => { e.stopPropagation(); if (!isLoading && !isGeneratingResponse) handleRegenerateMessage(messageContainer); else console.log("Regenerate ignored: operation in progress."); });
            actionsContainer.appendChild(regenerateButton); addedButton = true;
        }
        const deleteButtonAssistant = createActionButton('trash-2', 'Удалить сообщение', 'delete-message-btn');
        if (deleteButtonAssistant) {
             deleteButtonAssistant.addEventListener('click', (e) => { e.stopPropagation(); if (!isLoading && !isGeneratingResponse) handleDeleteMessage(messageContainer); else console.log("Delete ignored: operation in progress."); });
             actionsContainer.appendChild(deleteButtonAssistant); addedButton = true;
        }
    }
    // --- *** ERROR Message Actions (RETRY) - CORRECTED canRetry LOGIC *** ---
    else if (isError && typeof createActionButton === 'function') {
        console.log(`${logPrefix} Entering isError block to add retry button.`);
        actionsContainer.classList.add('error-actions');

        let lastUserMessageElement = null;
        const existingMessages = chatMessagesContainer.querySelectorAll('.message-container');
        for (let i = existingMessages.length - 1; i >= 0; i--) {
            const currentElement = existingMessages[i];
            if (currentElement.classList.contains('user-message') && !currentElement.classList.contains('editing')) {
                lastUserMessageElement = currentElement;
                break;
            }
        }

        if (lastUserMessageElement) {
            console.log(`${logPrefix} Found previous user message element (searching backwards):`, lastUserMessageElement.dataset);
            const userMessageId = lastUserMessageElement.dataset.messageId;
            const userMessageChatId = lastUserMessageElement.dataset.chatId; // Might be undefined initially
            const userMessageTempId = lastUserMessageElement.dataset.tempId;

            // *** ИЗМЕНЕНИЕ: Логика canRetry ***
            // Разрешаем повтор если:
            // 1. Это временный чат И есть временный ID ИЛИ
            // 2. Это НЕ временный чат И (есть ID сообщения ИЗ БД ИЛИ (есть временный ID И известен текущий ID чата))
            const canRetry = (isTempChat && userMessageTempId) ||
                             (!isTempChat && (userMessageId || (userMessageTempId && currentChatId && currentChatId > 0)));
            // *** КОНЕЦ ИЗМЕНЕНИЯ ***

            if (canRetry) {
                const retryButton = createActionButton('refresh-cw', 'Повторить запрос', 'retry-error-btn');
                if (retryButton) {
                    console.log(`${logPrefix} Retry button created.`);
                    retryButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (!isLoading && !isGeneratingResponse) {
                            // Передаем ID чата, который был у найденного сообщения, ИЛИ текущий ID чата, если у сообщения его нет
                            const effectiveChatId = userMessageChatId || currentChatId;
                            retryLastUserMessage(effectiveChatId, userMessageId, userMessageTempId, messageContainer);
                        } else {
                            console.log("Retry button clicked but operation in progress.");
                        }
                    });
                    actionsContainer.appendChild(retryButton);
                    addedButton = true;
                    console.log(`${logPrefix} Retry button appended to actionsContainer.`);
                } else {
                    console.error(`${logPrefix} createActionButton failed for retry button.`);
                }
            } else {
                 // Логируем причину невозможности повтора
                 console.warn(`${logPrefix} Cannot add retry button. Conditions: isTempChat=${isTempChat}, userMessageId=${userMessageId}, userMessageTempId=${userMessageTempId}, currentChatId=${currentChatId}.`);
            }

        } else {
            console.warn(`${logPrefix} Could not find preceding user message element (searching backwards). Retry button not added.`);
        }
    } // --- *** END of ERROR Message Actions *** ---


    // --- Append actions container IF buttons were added ---
    if (addedButton) {
        messageContainer.appendChild(actionsContainer);
        console.log(`${logPrefix} actionsContainer appended to messageContainer.`);
        if (typeof feather !== 'undefined') {
             try {
                 feather.replace({'stroke-width': 2.2});
                 console.log(`${logPrefix} Feather icons replaced for actions.`);
             } catch(e) {
                 console.error(`${logPrefix} Error replacing feather icons:`, e);
             }
        }
    } else {
         console.log(`${logPrefix} No action buttons added, actionsContainer not appended.`);
    }

    // --- Append the complete message container to the chat ---
    try {
        chatMessagesContainer.appendChild(messageContainer);
        if (!messageContainer.isConnected) {
             console.error(`${logPrefix} ОШИБКА: Message container not connected after appendChild!`);
        }
    } catch (domError) {
         console.error(`${logPrefix} ОШИБКА при добавлении messageContainer в DOM:`, domError, messageContainer);
         checkAndShowPlaceholder();
         return null;
    }

    // --- Final scroll ---
    scrollToBottom();

    return messageContainer;
}; // --- End of displayMessage ---


    // --- NEW: Event Listener for Code Copy Buttons (using event delegation) ---
    if (chatMessagesContainer) {
        chatMessagesContainer.addEventListener('click', function(event) {
            const copyButton = event.target.closest('.code-block-copy-button');
            if (copyButton) {
                event.stopPropagation();
                const targetCodeId = copyButton.dataset.targetCodeElement;
                const codeElement = document.getElementById(targetCodeId);
                if (codeElement) {
                    // --- ИЗМЕНЕНИЕ ЗДЕСЬ ---
                    const codeToCopy = codeElement.textContent.trimEnd(); // Удаляем пробелы/переносы в КОНЦЕ
                    // --- КОНЕЦ ИЗМЕНЕНИЯ ---
            
                    navigator.clipboard.writeText(codeToCopy).then(() => {
                        copyButton.innerHTML = feather.icons['check'].toSvg({'class': 'copy-success-icon'});
                        setTimeout(() => {
                            if (copyButton.isConnected) {
                                copyButton.innerHTML = feather.icons['copy'].toSvg();
                                try { feather.replace({'stroke-width': 2}); } catch(e){}
                            }
                        }, 1500);
                    }).catch(err => {
                        console.error('Ошибка копирования кода:', err);
                        copyButton.title = 'Ошибка копирования!';
                    });
                } else {
                    console.error("Не найден элемент кода для копирования:", targetCodeId);
                }
            }
        });
    }

/**
 * Повторяет отправку последнего сообщения пользователя при ошибке ответа AI.
 *
 * @param {number | string | null} chatId - ID чата (для постоянных) или null/0 (для временных).
 * @param {number | string | null} messageId - ID сообщения пользователя (для постоянных).
 * @param {string | null} tempId - Временный ID сообщения пользователя.
 * @param {HTMLElement} errorElement - DOM-элемент сообщения об ошибке, которое нужно удалить.
 */
const retryLastUserMessage = async (chatId, messageId, tempId, errorElement) => {
    const logPrefix = `retryLastUserMessage (chatId=${chatId}, messageId=${messageId}, tempId=${tempId}):`;

    // Не запускаем повтор, если уже идет генерация или другая фоновая загрузка
    if (isGeneratingResponse || isLoading) {
        console.warn(`${logPrefix} Повтор отменен, идет операция (isGeneratingResponse=${isGeneratingResponse}, isLoading=${isLoading}).`);
        return;
    }
    if (!errorElement || !errorElement.isConnected) {
        console.error(`${logPrefix} Элемент ошибки не найден или уже удален.`);
        return;
    }

    let userMessageElement = null;
    // Пытаемся найти элемент сообщения пользователя по ID
    if (!isTempChat && messageId && messageId !== 'null' && messageId !== 'undefined') {
        userMessageElement = chatMessagesContainer.querySelector(`.message-container[data-message-id="${messageId}"]`);
        if (userMessageElement) console.log(`${logPrefix} Найден элемент по messageId=${messageId}.`);
    } else if (isTempChat && tempId && tempId !== 'null' && tempId !== 'undefined') {
        userMessageElement = chatMessagesContainer.querySelector(`.message-container[data-temp-id="${tempId}"]`);
        if (userMessageElement) console.log(`${logPrefix} Найден элемент по tempId=${tempId}.`);
    }

    // Fallback: ищем предыдущий элемент user-message относительно элемента ошибки
    if (!userMessageElement) {
        console.log(`${logPrefix} Не найден по ID, ищем предыдущий элемент относительно errorElement...`);
        let currentElement = errorElement.previousElementSibling;
         while(currentElement && (!currentElement.classList.contains('user-message') || currentElement.classList.contains('editing'))) {
             currentElement = currentElement.previousElementSibling;
         }
         if (currentElement) {
             userMessageElement = currentElement;
             console.log(`${logPrefix} Найден предыдущий элемент через DOM traversal:`, userMessageElement.dataset);
         }
    }

    if (!userMessageElement || !userMessageElement.isConnected) {
        console.error(`${logPrefix} Не удалось найти исходное сообщение пользователя для повтора.`);
        alert("Не удалось найти исходное сообщение для повтора.");
        return;
    }

    const userContentElement = userMessageElement.querySelector('.message-bubble');
    const userContent = userContentElement?.textContent?.trim();
    if (!userContent) {
        console.error(`${logPrefix} Не удалось получить текст из элемента сообщения пользователя.`);
        alert("Не удалось получить текст исходного сообщения для повтора.");
        return;
    }

    // Определяем ID чата для API
    const chatIdForApi = (isTempChat || !chatId || String(chatId) === '0' || String(chatId) === 'null')
        ? 0
        : (chatId || currentChatId); // Используем переданный chatId или текущий

    console.log(`${logPrefix} Повторная отправка сообщения из чата ${chatIdForApi === 0 ? 'Инкогнито' : chatIdForApi}. Содержимое: "${userContent}"`);

    // Удаляем сообщение об ошибке и исходное сообщение пользователя (если оно было показано и мы его нашли)
    errorElement.remove();
    const userTempIdToRemove = userMessageElement.dataset.tempId;
    userMessageElement.remove();
    checkAndShowPlaceholder(); // Обновляем состояние плейсхолдера

    // Удаляем сообщение пользователя из временной истории, если это был временный чат
    // и мы нашли его по временному ID.
    if (isTempChat && userTempIdToRemove) {
        const indexToRemove = temporaryChatHistory.findIndex(m => m.tempId === userTempIdToRemove);
        if (indexToRemove > -1) {
            temporaryChatHistory.splice(indexToRemove, 1);
            console.log(`${logPrefix} Удалено сообщение ${userTempIdToRemove} из временной истории для повтора.`);
        } else {
            console.warn(`${logPrefix} Сообщение ${userTempIdToRemove} не найдено во временной истории для удаления (возможно, оно не было туда добавлено).`);
        }
    }

    // Сбрасываем флаги состояния ПЕРЕД новой операцией отправки.
    // sendMessageInternal сама установит их в true.
    isLoading = false;
    isGeneratingResponse = false;
    stopGenerationRequested = false; // Важно сбросить флаг остановки
    if (currentAbortController) { // Если был какой-то старый контроллер, отменяем его
        currentAbortController.abort('New retry operation started');
        currentAbortController = null;
    }
    updateSendButtonState(); // Обновляем состояние кнопки

    // Готовим историю для повторного запроса (только для временного чата)
    let historyForRetry = null; // null для постоянного чата, бэкенд сам соберет
    if (isTempChat) {
        // temporaryChatHistory уже не содержит повторяемое сообщение пользователя
        historyForRetry = temporaryChatHistory.map(m => ({ role: m.role, content: m.content }));
        console.log(`${logPrefix} Подготовлена история для повтора (Инкогнито): ${historyForRetry.length} сообщений.`);
    }

    // Вызываем внутреннюю функцию отправки сообщения
    await sendMessageInternal(userContent, historyForRetry);
    console.log(`${logPrefix} Вызов sendMessageInternal для повтора завершен.`);
};




/**
 * Внутренняя функция для отправки сообщения и получения ответа AI.
 * Обрабатывает как обычный JSON ответ, так и text/event-stream.
 * Использует AbortController для возможности отмены запроса.
 * ИГНОРИРУЕТ УСПЕШНЫЙ ОТВЕТ, ЕСЛИ БЫЛ НАЖАТ СТОП.
 *
 * @param {string} messageText - Текст сообщения пользователя.
 * @param {Array<Object> | null} historyOverride - Переопределение истории (для регенерации/редактирования инкогнито).
 */
const sendMessageInternal = async (messageText, historyOverride = null) => {
    // --- Сброс флага остановки при НАЧАЛЕ новой операции. ---
    stopGenerationRequested = false;
    console.log(`sendMessageInternal: Начало операции. stopGenerationRequested=${stopGenerationRequested}`);

    // --- AbortController для отмены fetch ---
    if (currentAbortController) {
         console.warn("sendMessageInternal: Найден существующий AbortController, отменяем перед созданием нового.");
         currentAbortController.abort('New operation started');
    }
    const localAbortController = new AbortController();
    currentAbortController = localAbortController;
    const signal = localAbortController.signal;
    console.log("sendMessageInternal: Создан новый AbortController.");

    // --- Проверки входных данных ---
    if (messageText === undefined && historyOverride === null) {
        console.warn(`sendMessageInternal: Выход - messageText не определен и нет historyOverride.`);
        if (currentAbortController === localAbortController) currentAbortController = null;
        return;
    }
    if (!messageText && historyOverride === null) {
        console.warn(`sendMessageInternal: Выход - messageText пуст (не регенерация/редактирование).`);
        if (currentAbortController === localAbortController) currentAbortController = null;
        return;
    }
    if (!currentModelId) {
        alert("Ошибка: Модель AI не выбрана.");
        if (currentAbortController === localAbortController) currentAbortController = null;
        return;
    }

    // --- Устанавливаем флаги состояния и обновляем кнопку ---
    isLoading = true;
    isGeneratingResponse = true;
    updateSendButtonState();
    console.log(`sendMessageInternal: Флаги установлены. isLoading=${isLoading}, isGeneratingResponse=${isGeneratingResponse}`);

    let optimisticallyDisplayedUserMessageElement = null;
    const userTempId = `temp-${Date.now()}-user`;
    let aiMessageContainer = null; // Для стриминга: ссылка на контейнер сообщения AI
    let aiContentElement = null;   // Для стриминга: ссылка на элемент контента AI
    const ai_temp_id_for_stream = `temp-${Date.now()}-assistant-stream`; // Генерируем временный ID для AI ответа при стриме

    // --- Удаляем предыдущие уведомления/ошибки ---
    const lastStopNotification = chatMessagesContainer.querySelector('.message-container.stop-notification-message:last-of-type');
    if (lastStopNotification) {
        console.log("sendMessageInternal: Удаляем предыдущее уведомление об остановке.");
        lastStopNotification.remove();
    }
    const lastError = chatMessagesContainer.querySelector('.message-container.error-message:last-of-type');
    if (lastError) {
        console.log("sendMessageInternal: Удаляем предыдущее сообщение об ошибке.");
        lastError.remove();
    }

    // --- Оптимистичное отображение сообщения пользователя (только для нового ввода) ---
    if (historyOverride === null && messageText) {
        optimisticallyDisplayedUserMessageElement = displayMessage( messageText, 'user', null, isTempChat ? 0 : currentChatId, false, false, userTempId );
        if (!optimisticallyDisplayedUserMessageElement) {
             console.error("sendMessageInternal: Ошибка отображения оптимистичного сообщения пользователя!");
             isLoading = false; isGeneratingResponse = false; updateSendButtonState();
             if (currentAbortController === localAbortController) currentAbortController = null;
             return;
        }
    }
    showLoadingIndicator(); // Показываем индикатор

    let targetChatIdForApi = isTempChat ? 0 : currentChatId;
    let requestErrorOccurred = false; // Флаг для отслеживания, была ли уже обработана ошибка
    let caughtError = null; // Используем для передачи ошибки в finally
    let isStreamingResponse = false; // Флаг для определения типа ответа
    let firstCharReceived   = false; // НОВОЕ: отмечаем, что пришёл первый символ

    try {
        // --- Создание нового постоянного чата, если необходимо ---
        let isNewPermanentChat = false;
        if (!isTempChat && targetChatIdForApi === null) {
             isNewPermanentChat = true;
             console.log("Создание нового постоянного чата...");

             if (signal.aborted) throw new Error(`Operation aborted before chat creation: ${signal.reason}`);

             const createChatResponse = await fetch('/api/v1/chats/', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ title: messageText.substring(0, 40) + (messageText.length > 40 ? '...' : ''), is_temporary: false }),
                 signal: signal
             });

             if (signal.aborted) throw new Error(`Operation aborted after chat creation attempt: ${signal.reason}`);

             if (!createChatResponse.ok) {
                 requestErrorOccurred = true;
                 let err = `Ошибка создания чата: ${createChatResponse.status}`; try { err = (await createChatResponse.json()).detail || err; } catch (e) {}
                 console.error("Ошибка создания чата:", err);
                 if (optimisticallyDisplayedUserMessageElement) optimisticallyDisplayedUserMessageElement.remove();
                 displayMessage(`Не удалось создать чат: ${err}`, 'system', null, null, false, true, `temp-${Date.now()}-error-chat`);
                 throw new Error("Chat creation failed");
             }

             const newChatData = await createChatResponse.json();
             targetChatIdForApi = newChatData.id;
             currentChatId = targetChatIdForApi;
             console.log("Создан новый постоянный чат с ID:", currentChatId);
             await loadChatHistory();
             setActiveChat(currentChatId);
             showLoadingIndicator(); // Показываем индикатор снова
        }

        if (targetChatIdForApi === null && !isTempChat) {
             throw new Error("Chat ID is null for permanent chat after creation/check");
        }

        // --- Подготовка истории для AI с учетом системных инструкций ---
        let historyForApi = [];
        if (currentSystemInstructions) {
            historyForApi.push({ role: "system", content: currentSystemInstructions });
            console.log("sendMessageInternal: Добавлены системные инструкции в историю для API.");
        }
        
        let historySource = null;
        if (isTempChat && historyOverride === null) {
            // Для временного чата используем temporaryChatHistory
            historySource = temporaryChatHistory;
        } else if (historyOverride !== null) {
            // Если передан historyOverride (при редактировании/регенерации)
            historySource = historyOverride;
        } else if (!isTempChat && historyOverride === null) {
            // Для постоянного чата при обычной отправке - собираем историю из видимых элементов UI
            historySource = [];
            const visibleMessages = chatMessagesContainer.querySelectorAll('.message-container:not(.stop-notification-message):not(.error-message):not(.loading-indicator-container)');
            visibleMessages.forEach(msgEl => {
                const role = msgEl.classList.contains('user-message') ? 'user' : 'assistant';
                const contentEl = msgEl.querySelector('.message-bubble, .message-content');
                const content = contentEl ? contentEl.textContent.trim() : '';
                if (content && !msgEl.classList.contains('editing')) {
                    historySource.push({ role, content });
                }
            });
            console.log(`sendMessageInternal: Собрана видимая история из UI для постоянного чата: ${historySource.length} сообщений`);
        }
        
        if (historySource) {
            historySource.forEach(msg => {
                // Пропускаем системное сообщение из historySource, если оно идентично currentSystemInstructions
                if (msg.role === "system" && currentSystemInstructions && msg.content === currentSystemInstructions) {
                    return;
                }
                historyForApi.push({ role: msg.role, content: msg.content });
            });
        }

        const requestBody = {
             ai_model_id: currentModelId,
             message_data: { role: "user", content: messageText }, // Только НОВОЕ сообщение
             is_temporary: isTempChat,
             history: historyForApi, // Системный промпт + история (если temp/override)
             user_temp_id: userTempId,
             streaming: isStreamingEnabled // Добавляем параметр стриминга
        };

        console.log(`Отправка запроса к /completion для чата ${targetChatIdForApi}...`);
        console.log("Подготовленная история (без нового сообщения пользователя) для API:", requestBody.history);

        if (signal.aborted) throw new Error(`Operation aborted before completion request: ${signal.reason}`);

        // --- Отправляем запрос ---
        const completionResponse = await fetch(`/api/v1/chats/${targetChatIdForApi}/completion`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': isStreamingEnabled ? 'text/event-stream' : 'application/json' // Указываем нужный тип в зависимости от настройки
            },
            body: JSON.stringify(requestBody),
            signal: signal
        });

        if (signal.aborted) throw new Error(`Operation aborted after completion request: ${signal.reason}`);
        console.log("Ответ от /completion получен, статус:", completionResponse.status);

        const contentType = completionResponse.headers.get("content-type");
        isStreamingResponse = contentType && contentType.includes("text/event-stream");

        // --- ОБРАБОТКА НЕСТРИМИНГОВОГО JSON ОТВЕТА ---
        if (!isStreamingResponse) {
            console.log("Получен JSON ответ (не стриминг).");
            hideLoadingIndicator();                   // <-- скрываем кружок при полном ответе
            if (!completionResponse.ok) {
                 requestErrorOccurred = true;
                 let errDetail = `Ошибка ${completionResponse.status}`;
                 try { errDetail = (await completionResponse.json()).detail || errDetail; } catch (e) {}
                 console.error("Ошибка от /completion (JSON):", errDetail);
                 if (!signal.aborted) {
                     displayMessage(genericErrorMessage, 'assistant', null, targetChatIdForApi, false, true, `temp-${Date.now()}-error-json`);
                 }
            } else {
                 const responseData = await completionResponse.json();

                 if (stopGenerationRequested) { console.log("JSON ответ получен, но стоп нажат. Игнорируем."); return; }
                 if (signal.aborted) { console.log("JSON ответ получен, но операция прервана."); return; }

                 console.log("Успешный JSON ответ /completion, данные:", responseData);
                 const userMessageData = responseData.user_message;
                 const aiMessageData = responseData.assistant_message;

                 // Обновление/добавление временной истории
                 if (isTempChat) {
                    if (userMessageData && userMessageData.temp_id && userMessageData.content !== undefined && !temporaryChatHistory.some(m => m.tempId === userMessageData.temp_id)) {
                         temporaryChatHistory.push({ tempId: userMessageData.temp_id, role: userMessageData.role, content: userMessageData.content });
                    }
                    if (aiMessageData && aiMessageData.temp_id && aiMessageData.content !== undefined) {
                        temporaryChatHistory.push({ tempId: aiMessageData.temp_id, role: aiMessageData.role, content: aiMessageData.content });
                    }
                    const MAX_TEMP_HISTORY = 50;
                    if (temporaryChatHistory.length > MAX_TEMP_HISTORY) {
                        temporaryChatHistory = temporaryChatHistory.slice(-MAX_TEMP_HISTORY);
                    }
                 }

                 // Обновление dataset оптимистичного сообщения
                 if (optimisticallyDisplayedUserMessageElement && userMessageData) {
                     if (!isTempChat && userMessageData.id && userMessageData.chat_id) {
                         optimisticallyDisplayedUserMessageElement.dataset.messageId = userMessageData.id;
                         optimisticallyDisplayedUserMessageElement.dataset.chatId = userMessageData.chat_id;
                     }
                     if (optimisticallyDisplayedUserMessageElement.dataset.tempId !== userMessageData.temp_id && userMessageData.temp_id) {
                          optimisticallyDisplayedUserMessageElement.dataset.tempId = userMessageData.temp_id;
                     }
                 } else if (!optimisticallyDisplayedUserMessageElement && userMessageData && historyOverride === null) {
                      displayMessage(userMessageData.content, 'user', userMessageData.id, userMessageData.chat_id, false, false, userMessageData.temp_id);
                 }

                 // Отображение сообщения AI
                 if (aiMessageData && aiMessageData.content !== undefined && aiMessageData.content.trim() !== '') {
                      displayMessage(aiMessageData.content, 'assistant', aiMessageData.id, aiMessageData.chat_id, false, false, aiMessageData.temp_id);
                 } else {
                      requestErrorOccurred = true;
                      if (aiMessageData && aiMessageData.content !== undefined && aiMessageData.content.trim() === '') {
                          console.error("Модель вернула пустой ответ (JSON)");
                          displayMessage("Модель выдала пустой ответ. Пожалуйста, попробуйте переформулировать ваш запрос или выберите другую модель.", 'assistant', null, targetChatIdForApi, false, true, `temp-${Date.now()}-error-empty-response`);
                      } else {
                          console.error("Ответ AI не найден или не содержит контент (JSON):", aiMessageData);
                          displayMessage("Не удалось получить корректный ответ от AI.", 'assistant', null, targetChatIdForApi, false, true, `temp-${Date.now()}-error-parse-json`);
                      }
                 }

                 if (isNewPermanentChat && aiMessageData?.content && messageText) {
                     updateNewChatTitle(targetChatIdForApi, messageText, aiMessageData.content);
                 }
                 if (!isTempChat && targetChatIdForApi > 0) {
                     loadChatHistory();
                 }

                 isLoading = false; isGeneratingResponse = false; // Сброс флагов при успехе
                 console.log("sendMessageInternal try/success (JSON): Успешное завершение, флаги сброшены.");
            }
        }
        // --- ОБРАБОТКА СТРИМИНГОВОГО ОТВЕТА ---
        else {
            console.log("Получен text/event-stream ответ.");
            if (!completionResponse.ok) { // Ошибка статуса ДО начала стрима
                requestErrorOccurred = true;
                let errText = await completionResponse.text();
                console.error(`Ошибка ${completionResponse.status} перед началом стрима:`, errText);
                if (!signal.aborted) {
                    displayMessage(`Ошибка стрима: ${completionResponse.status}`, 'assistant', null, targetChatIdForApi, false, true, `temp-${Date.now()}-error-stream-status`);
                }
            } else {
                 const reader = completionResponse.body.getReader();
                 const decoder = new TextDecoder();
                 let buffer = '';

                 while (true) {
                     if (signal.aborted) { console.log("Чтение стрима прервано сигналом Abort."); throw new Error("Operation aborted during stream reading"); }
                     if (stopGenerationRequested) { console.log("Чтение стрима прервано флагом Stop."); break; }

                     const { value, done } = await reader.read();

                     if (done) {
                         console.log("Стрим завершен (reader.read done=true).");
                         if (buffer.trim()) processSSEBuffer(buffer); // Обработка остатка
                         break;
                     }

                     buffer += decoder.decode(value, { stream: true });
                     let eventBoundary = buffer.indexOf('\n\n');
                     while (eventBoundary !== -1) {
                         const eventText = buffer.substring(0, eventBoundary);
                         buffer = buffer.substring(eventBoundary + 2);
                         if (eventText.trim()) processSSEBuffer(eventText);
                         eventBoundary = buffer.indexOf('\n\n');
                     }
                 } // Конец while(true)

                 if (stopGenerationRequested) {
                     console.log("Стрим завершен из-за флага stopGenerationRequested.");
                     // Сообщение об остановке уже должно быть показано кнопкой "Стоп"
                 } else {
                     console.log("Стрим завершен нормально.");
                 }

                 // Применяем Markdown/Highlighting к ПОЛНОМУ тексту AI сообщения
                 if (aiMessageContainer && aiContentElement) {
                     console.log("Применение финального рендеринга к сообщению AI...");
                     applyFinalRendering(aiContentElement);
                     // Добавляем кнопки действий, если их еще нет
                     if (!aiMessageContainer.querySelector('.message-actions')) {
                          addActionsToMessage(aiMessageContainer, 'assistant', aiMessageContainer.dataset.messageId, aiMessageContainer.dataset.chatId, aiMessageContainer.dataset.tempId || ai_temp_id_for_stream);
                     }
                 } else if (!stopGenerationRequested) { // Логируем, только если не было остановки
                      console.warn("Не найден контейнер AI сообщения для финального рендеринга (возможно, ответ был пустым).");
                 }
                 // Стриминг успешно завершен (или остановлен) - флаги сбросятся в finally
            }
        }
    } catch (error) {
        caughtError = error;
        hideLoadingIndicator();
        if (error.name === 'AbortError' || error.message?.includes("aborted")) {
            console.log(`sendMessageInternal catch: Операция прервана (${error.name || 'Custom Abort'}). Причина: ${error.message}`);
            if (stopGenerationRequested) {
                displayMessage("Генерация остановлена пользователем.", "system", null, null, true, false);
            }
            // Флаги сбросятся в finally
        } else {
            console.error("Критическая ошибка в sendMessageInternal:", error);
            if (!requestErrorOccurred && !signal.aborted && !document.querySelector('.message-container.error-message')) {
                 displayMessage(genericErrorMessage, 'assistant', null, targetChatIdForApi, false, true, `temp-${Date.now()}-error-generic-catch`);
            }
        }
    } finally {
        console.log(`sendMessageInternal finally: Entering. isGeneratingResponse=${isGeneratingResponse}, isLoading=${isLoading}, stopGenerationRequested=${stopGenerationRequested}`);
        if (currentAbortController === localAbortController) {
             currentAbortController = null;
             console.log("sendMessageInternal finally: AbortController очищен.");
        }
        // Окончательно сбрасываем флаги
        isLoading = false;
        isGeneratingResponse = false;
        stopGenerationRequested = false; // Сбрасываем флаг остановки, т.к. операция завершена

        updateSendButtonState();
        checkAndShowPlaceholder();
        console.log(`sendMessageInternal finally: Завершение. Flags reset. isGeneratingResponse=${isGeneratingResponse}, isLoading=${isLoading}, stopGenerationRequested=${stopGenerationRequested}`);
        setTimeout(() => scrollToBottom(true), 50);
    }

    // --- Вспомогательная функция для обработки SSE буфера ---
    function processSSEBuffer(eventText) {
        const lines = eventText.split('\n');
        lines.forEach(line => {
            if (line.startsWith("data:")) {
                const dataContent = line.substring(5).trim();
                if (!dataContent) return; // Игнорируем пустые data
                // НЕ игнорируем "[DONE]" здесь, пусть handleSSEEvent решит
                try {
                    const eventData = JSON.parse(dataContent);
                    handleSSEEvent(eventData);
                } catch (e) {
                    // Если парсинг не удался, и это не [DONE], то это может быть обычный текст (некоторые API так делают)
                    if (dataContent !== "[DONE]") {
                        console.warn("SSE data не JSON и не [DONE], обрабатываем как текст:", dataContent);
                        handleSSEEvent({ "delta": dataContent }); // Попытка обработать как дельту
                    } else if (dataContent === "[DONE]") {
                        console.log("SSE: Получен [DONE] маркер.");
                        handleSSEEvent({ "done": true }); // Явно передаем маркер
                    } else {
                        console.error("Ошибка парсинга SSE data JSON:", e, "Data:", dataContent);
                    }
                }
            }
        });
    }

    // --- Вспомогательная функция для обработки данных из SSE event ---
    function handleSSEEvent(eventData) {
        if (stopGenerationRequested && !eventData.done && !eventData.error) { // Продолжаем обрабатывать done/error даже если стоп
            console.log("handleSSEEvent: stopGenerationRequested=true, игнорируем событие (кроме done/error):", eventData);
            return;
        }

        if (eventData.user_message) {
             const userMsg = eventData.user_message;
             console.log("SSE Event: Получен user_message", userMsg);
             if (optimisticallyDisplayedUserMessageElement) {
                 if (!isTempChat && userMsg.id && userMsg.chat_id) {
                     optimisticallyDisplayedUserMessageElement.dataset.messageId = userMsg.id;
                     optimisticallyDisplayedUserMessageElement.dataset.chatId = userMsg.chat_id;
                 }
                 if (optimisticallyDisplayedUserMessageElement.dataset.tempId !== userMsg.temp_id && userMsg.temp_id) {
                     optimisticallyDisplayedUserMessageElement.dataset.tempId = userMsg.temp_id;
                 }
             } else if (userMsg.content !== undefined && historyOverride === null) {
                  displayMessage(userMsg.content, 'user', userMsg.id, userMsg.chat_id, false, false, userMsg.temp_id);
             }
             if (isTempChat && userMsg.temp_id && userMsg.content !== undefined && !temporaryChatHistory.some(m => m.tempId === userMsg.temp_id)) {
                 temporaryChatHistory.push({ tempId: userMsg.temp_id, role: userMsg.role, content: userMsg.content });
                 console.log(`Temp History ADD (SSE User): User message ${userMsg.temp_id}`);
             }
        }
        else if (eventData.delta) {
             const delta = eventData.delta;
             if (!firstCharReceived) {               // скрываем кружок при первом символе
                  firstCharReceived = true;
                  hideLoadingIndicator();
             }
             if (!aiMessageContainer) {
                 aiMessageContainer = displayMessage("", 'assistant', null, isTempChat ? 0 : targetChatIdForApi, false, false, ai_temp_id_for_stream);
                 if (aiMessageContainer) {
                     aiContentElement = aiMessageContainer.querySelector('.message-content');
                     // Инициализируем накопитель текста
                     aiContentElement._accumulatedText = '';
                     const actions = aiMessageContainer.querySelector('.message-actions');
                     if (actions) actions.remove(); // Удаляем кнопки, они добавятся после рендеринга
                 } else { console.error("Не удалось создать контейнер для AI сообщения при стриминге!"); return; }
             }
             if (aiContentElement) {
                  // Накапливаем текст
                  aiContentElement._accumulatedText += delta;
                  
                  // Применяем markdown рендеринг к накопленному тексту
                  try {
                      if (typeof marked === 'undefined') {
                          // Если marked не загружен, показываем как plain text с переносами строк
                          aiContentElement.innerHTML = aiContentElement._accumulatedText.replace(/\n/g, '<br>');
                      } else {
                          // Рендерим markdown
                          const rawHtml = marked.parse(aiContentElement._accumulatedText || '', { breaks: true, gfm: true });
                          aiContentElement.innerHTML = rawHtml;
                          
                          // Оборачиваем таблицы через общую функцию
                          if (typeof wrapTables === 'function') {
                              wrapTables(aiContentElement);
                          }
                          
                          // Обрабатываем блоки кода
                          if (typeof processCodeBlocks === 'function') {
                              processCodeBlocks(aiContentElement);
                          }
                      }
                  } catch (e) {
                      // При ошибке рендеринга показываем как plain text
                      console.warn("Ошибка при инкрементальном рендеринге markdown:", e);
                      aiContentElement.textContent = aiContentElement._accumulatedText;
                  }
                  
                  scrollToBottom();
             }
        }
        else if (eventData.error) {
             console.error("SSE Event: Получена ошибка из стрима", eventData.error);
             requestErrorOccurred = true; // Устанавливаем флаг, что ошибка уже обработана
             
             // Специальная обработка для Rate Limit ошибок
             if (eventData.error_type === 'rate_limit_during_stream' || eventData.error_type === 'rate_limit_final') {
                 const errorMessage = "Превышен лимит запросов. Повторная попытка через несколько секунд...";
                 displayMessage(errorMessage, 'assistant', null, targetChatIdForApi, false, true, `temp-${Date.now()}-error-rate-limit`);
                 
                 // Автоматический повтор через 5 секунд
                 setTimeout(() => {
                     console.log("Автоматический повтор после Rate Limit...");
                     const lastErrorMsg = chatMessagesContainer.querySelector('.message-container.error-message:last-of-type');
                     if (lastErrorMsg) lastErrorMsg.remove();
                     
                     // Повторяем последний запрос
                     if (optimisticallyDisplayedUserMessageElement) {
                         const userContent = optimisticallyDisplayedUserMessageElement.querySelector('.message-bubble')?.textContent;
                         if (userContent) {
                             // Удаляем оптимистично отображенное сообщение
                             optimisticallyDisplayedUserMessageElement.remove();
                             // Сбрасываем флаги
                             isLoading = false;
                             isGeneratingResponse = false;
                             stopGenerationRequested = false;
                             updateSendButtonState();
                             // Повторяем отправку
                             sendMessageInternal(userContent, historyOverride);
                         }
                     }
                 }, 5000);
             } else {
                 displayMessage(eventData.error.message || genericErrorMessage, 'assistant', null, targetChatIdForApi, false, true, `temp-${Date.now()}-error-stream-event`);
             }
             
             stopGenerationRequested = true; // Останавливаем дальнейшую обработку, если пришла ошибка
        }
        else if (eventData.done) {
            hideLoadingIndicator();
            console.log("SSE Event: Получен сигнал done.", eventData);
            
            // Проверяем на пустой ответ
            if (aiContentElement) {
                const finalContent = aiContentElement._accumulatedText || aiContentElement.textContent || '';
                if (finalContent.trim() === '') {
                    console.error("Модель вернула пустой ответ (Streaming)");
                    // Удаляем пустой контейнер сообщения AI
                    if (aiMessageContainer) {
                        aiMessageContainer.remove();
                        aiMessageContainer = null;
                        aiContentElement = null;
                    }
                    // Показываем сообщение об ошибке
                    displayMessage("Модель выдала пустой ответ. Пожалуйста, попробуйте переформулировать ваш запрос или выберите другую модель.", 'assistant', null, targetChatIdForApi, false, true, `temp-${Date.now()}-error-empty-stream`);
                    requestErrorOccurred = true;
                    return; // Прерываем дальнейшую обработку
                }
            }
            
             if (aiMessageContainer && eventData.assistant_message_id && !isTempChat) {
                 aiMessageContainer.dataset.messageId = eventData.assistant_message_id;
                 // chatId уже должен быть на aiMessageContainer
             }
             if (!isTempChat && targetChatIdForApi > 0) {
                 console.log("SSE Event (done): Обновляем историю чатов для постоянного чата.");
                 loadChatHistory();
             }
             // Если ответ AI был временным (isTempChat = true) и есть контент, добавляем его в temporaryChatHistory
             if (isTempChat && aiMessageContainer && aiContentElement) {
                 // Используем накопленный текст, если есть, иначе textContent
                 const finalAiContent = aiContentElement._accumulatedText || aiContentElement.textContent;
                 if (finalAiContent && !temporaryChatHistory.some(m => m.tempId === ai_temp_id_for_stream)) {
                     temporaryChatHistory.push({ tempId: ai_temp_id_for_stream, role: 'assistant', content: finalAiContent });
                     console.log(`Temp History ADD (SSE AI Done): AI message ${ai_temp_id_for_stream}`);
                     const MAX_TEMP_HISTORY = 50;
                     if (temporaryChatHistory.length > MAX_TEMP_HISTORY) {
                         temporaryChatHistory = temporaryChatHistory.slice(-MAX_TEMP_HISTORY);
                     }
                 }
             }
        } else {
             console.warn("SSE Event: Неизвестный тип данных в событии:", eventData);
        }
    }

    function applyFinalRendering(contentElement) {
        if (!contentElement) return;
        // Используем накопленный текст, если он есть, иначе берем textContent
        const rawText = contentElement._accumulatedText || contentElement.textContent;
        try {
            if (typeof marked === 'undefined') {
                 contentElement.innerHTML = rawText.replace(/\n/g, '<br>');
            } else {
                 const rawHtml = marked.parse(rawText || '', { breaks: true, gfm: true });
                 contentElement.innerHTML = rawHtml;
                 
                 // Оборачиваем таблицы через общую функцию
                 if (typeof wrapTables === 'function') {
                     wrapTables(contentElement);
                 }
                 if (typeof processCodeBlocks === 'function') {
                      processCodeBlocks(contentElement);
                 }
            }
        } catch (e) {
             console.error(`Ошибка финального рендеринга Markdown:`, e);
             contentElement.textContent = rawText; // Возвращаем как текст в случае ошибки
        }
        // Очищаем накопленный текст после финального рендеринга
        delete contentElement._accumulatedText;
    }

    function addActionsToMessage(messageContainer, role, messageId, chatId, tempId) {
        if (!messageContainer || messageContainer.querySelector('.message-actions')) {
            // console.log("addActionsToMessage: Контейнер не найден или кнопки уже есть.");
            return;
        }

        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'message-actions';
        let addedButton = false;
        const contentElement = messageContainer.querySelector('.message-content');
        const messageTextContent = contentElement?._accumulatedText || contentElement?.textContent || messageContainer.querySelector('.message-bubble')?.textContent || '';

        if ((role === 'user' || role === 'assistant') && typeof createActionButton === 'function') {
            const copyButton = createActionButton('copy', 'Копировать');
            if (copyButton) {
                copyButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(messageTextContent).then(() => {
                        if (typeof feather !== 'undefined' && feather.icons['check']) {
                            copyButton.innerHTML = feather.icons['check'].toSvg({'stroke-width': 2.2, 'class': 'copy-success-icon'});
                            setTimeout(() => { if (copyButton.isConnected && feather.icons['copy']) { try { copyButton.innerHTML = feather.icons['copy'].toSvg({'stroke-width': 2.2}); } catch (feError) {} } }, 1500);
                        }
                    }).catch(err => console.error(`Ошибка копирования:`, err));
                });
                actionsContainer.appendChild(copyButton); addedButton = true;
            }
        }

        if (role === 'user' && typeof createActionButton === 'function') {
            const editButton = createActionButton('edit-2', 'Изменить');
            if (editButton) {
                editButton.addEventListener('click', (e) => { e.stopPropagation(); if (!isLoading && !isGeneratingResponse) handleEditMessage(messageContainer); });
                actionsContainer.appendChild(editButton); addedButton = true;
            }
            const deleteButtonUser = createActionButton('trash-2', 'Удалить сообщение', 'delete-message-btn');
            if (deleteButtonUser) {
                deleteButtonUser.addEventListener('click', (e) => { e.stopPropagation(); if (!isLoading && !isGeneratingResponse) handleDeleteMessage(messageContainer); });
                actionsContainer.appendChild(deleteButtonUser); addedButton = true;
            }
        } else if (role === 'assistant' && typeof createActionButton === 'function') {
            const regenerateButton = createActionButton('refresh-cw', 'Регенерировать ответ', 'regenerate-message-btn');
            if (regenerateButton) {
                regenerateButton.addEventListener('click', (e) => { e.stopPropagation(); if (!isLoading && !isGeneratingResponse) handleRegenerateMessage(messageContainer); });
                actionsContainer.appendChild(regenerateButton); addedButton = true;
            }
            const deleteButtonAssistant = createActionButton('trash-2', 'Удалить сообщение', 'delete-message-btn');
            if (deleteButtonAssistant) {
                deleteButtonAssistant.addEventListener('click', (e) => { e.stopPropagation(); if (!isLoading && !isGeneratingResponse) handleDeleteMessage(messageContainer); });
                actionsContainer.appendChild(deleteButtonAssistant); addedButton = true;
            }
        }

        if (addedButton) {
            messageContainer.appendChild(actionsContainer);
            if (typeof feather !== 'undefined') {
                 try { feather.replace({'stroke-width': 2.2}); } catch(e) {}
            }
        }
    }

}; // --- End of sendMessageInternal ---


const sendMessage = () => {
    const inputText = messageInput.value.trim();

    // --- Логика кнопки СТОП ---
    if (isGeneratingResponse) {
        console.log("Нажата кнопка СТОП");
        stopGenerationRequested = true; // Устанавливаем флаг, чтобы sendMessageInternal и другие процессы могли его проверить

        // Отменяем текущий fetch запрос, если он есть
        if (currentAbortController) {
            console.log("sendMessage (Stop): Отмена текущего AbortController.");
            currentAbortController.abort('User requested stop'); // Передаем причину отмены
            currentAbortController = null; // Сбрасываем контроллер, т.к. операция прервана
        } else {
            console.warn("sendMessage (Stop): Нажата кнопка СТОП, но активный AbortController не найден.");
        }

        // Немедленно сбрасываем флаги состояния И обновляем кнопку,
        // так как генерация принудительно остановлена.
        isLoading = false;
        isGeneratingResponse = false;
        console.log(`sendMessage (Stop): Флаги сброшены. isLoading=${isLoading}, isGeneratingResponse=${isGeneratingResponse}`);
        updateSendButtonState(); // Обновляем UI кнопки

        hideLoadingIndicator(); // Скрываем индикатор загрузки, если он был
        // Отображаем системное сообщение об остановке
        displayMessage("Генерация остановлена пользователем.", "system", null, null, true, false);
        scrollToBottom(true); // Прокручиваем, чтобы увидеть сообщение

        return; // Выходим, так как действие - остановка
    }
    // --- Конец логики СТОП ---

    // Предотвращаем отправку, если уже идет другая загрузка (isLoading, но не isGeneratingResponse)
    // или если поле ввода пустое.
    if (isLoading || inputText === '') {
        if (isLoading) {
            console.warn(`sendMessage: Отправка отменена (isLoading=${isLoading}). Возможно, идет загрузка истории или другая фоновая операция.`);
        }
        if (inputText === '') {
            console.warn(`sendMessage: Отправка отменена (поле ввода пустое).`);
        }
        return;
    }

    // Очищаем поле ввода и подстраиваем его высоту
    messageInput.value = '';
    adjustInputHeight(); // Предполагается, что эта функция существует

    // Вызываем внутреннюю функцию отправки.
    // `sendMessageInternal` сама установит isGeneratingResponse = true и isLoading = true,
    // а также создаст новый AbortController.
    // Второй аргумент `null` для historyOverride означает, что для постоянных чатов
    // бэкенд сам загрузит историю, а для новых временных чатов история будет пустой.
    sendMessageInternal(inputText, null);
};

    // --- Обработчики поля ввода ---
    if (messageInput) {
        messageInput.addEventListener('input', () => { adjustInputHeight(); updateSendButtonState(); });
        messageInput.addEventListener('keydown', (event) => {
             if (event.key === 'Enter' && !event.shiftKey) {
                 event.preventDefault();
                 // --- FIX: Вызываем sendMessage, которая содержит всю логику кнопки ---
                 if (sendButton && !sendButton.disabled) { // Проверяем только disabled
                     sendMessage();
                 }
             }
        });
    } else { console.error("#message-input element not found."); }

    // --- Обработчик кнопки отправки/остановки ---
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage); // Одна функция для обоих действий
    } else { console.error("#send-button element not found."); }

    // --- Логика мобильного меню (сайдбара) ---
    if (sidebar && sidebarToggle && sidebarOverlay) {
        const openSidebar = () => {
             if (window.innerWidth > 768 && appContainer.classList.contains('sidebar-collapsed')) {
                  appContainer.classList.remove('sidebar-collapsed'); updateSidebarToggleIcons(false);
                  setTimeout(() => { sidebar.classList.add('open'); sidebarOverlay.classList.remove('hidden'); }, 50);
             } else { sidebar.classList.add('open'); sidebarOverlay.classList.remove('hidden'); }
        };
        const closeSidebar = () => { sidebar.classList.remove('open'); sidebarOverlay.classList.add('hidden'); };
        sidebarToggle.addEventListener('click', (event) => { event.stopPropagation(); if (sidebar.classList.contains('open')) closeSidebar(); else openSidebar(); });
        sidebarOverlay.addEventListener('click', closeSidebar);
        window.addEventListener('resize', () => { if (window.innerWidth > 768 && sidebar.classList.contains('open')) closeSidebar(); });
    } else { console.error("Sidebar elements not found."); }

    // --- Логика селектора моделей ---
    const updateModelList = () => {
        if (!modelListUl || !currentModelId || Object.keys(availableModels).length === 0) return;
        modelListUl.innerHTML = '';
        for (const modelId in availableModels) {
            const modelName = availableModels[modelId]; const li = document.createElement('li');
            li.dataset.modelId = modelId; li.textContent = modelName;
            if (modelId === currentModelId) { li.classList.add('selected'); li.innerHTML = `${modelName} <span class="checkmark"><i data-feather="check"></i></span>`; }
            li.addEventListener('click', () => {
                const clickedModelId = li.dataset.modelId; const clickedModelName = availableModels[clickedModelId];
                currentModelId = clickedModelId; if(currentModelNameSpan) currentModelNameSpan.textContent = clickedModelName;
                localStorage.setItem('selectedModelId', currentModelId); updateModelList();
                if(modelPopup) modelPopup.classList.add('hidden'); if(modelSelectorButton) modelSelectorButton.classList.remove('open');
                console.log("Выбрана модель:", currentModelId);
            });
            modelListUl.appendChild(li);
        }
         try { feather.replace({'stroke-width': 2}); } catch(e) {} // <-- FIX: Перерисовываем иконку галочки
    };
    const loadAndPopulateModels = async () => {
        console.log("loadAndPopulateModels: Начало загрузки моделей");
        if (!modelSelectorButton || !modelPopup || !currentModelNameSpan || !modelListUl) {
            console.error("Ключевые элементы селектора моделей не найдены.");
            if(currentModelNameSpan) currentModelNameSpan.textContent = "Ошибка UI";
            return;
        }
        
        // Устанавливаем таймаут для запроса
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд таймаут
        
        try {
            console.log("loadAndPopulateModels: Отправка запроса к /api/v1/system/models");
            const response = await fetch('/api/v1/system/models', { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`Ошибка сети: ${response.status}`);
            }
            
            const modelsData = await response.json();
            console.log("loadAndPopulateModels: Получены модели:", modelsData);
            
            if (!modelsData || Object.keys(modelsData).length === 0) {
                currentModelNameSpan.textContent = "Модели не найдены";
                availableModels = {};
                currentModelId = null;
                localStorage.removeItem('selectedModelId');
                console.warn("Список доступных моделей пуст.");
            } else {
                availableModels = modelsData;
                const availableModelIds = Object.keys(availableModels);
                let savedModelId = localStorage.getItem('selectedModelId');
                
                if (savedModelId && availableModelIds.includes(savedModelId)) {
                    currentModelId = savedModelId;
                } else {
                    currentModelId = availableModelIds[0];
                    if (currentModelId) {
                        localStorage.setItem('selectedModelId', currentModelId);
                    } else {
                        localStorage.removeItem('selectedModelId');
                    }
                }
                
                if (currentModelId) {
                    currentModelNameSpan.textContent = availableModels[currentModelId];
                } else {
                    currentModelNameSpan.textContent = "Модель не выбрана";
                }
            }
            updateModelList();
            console.log("loadAndPopulateModels: Успешно завершено");
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                console.error("loadAndPopulateModels: Таймаут запроса (10 секунд)");
                currentModelNameSpan.textContent = "Таймаут загрузки";
            } else {
                console.error("loadAndPopulateModels: Ошибка:", error);
                currentModelNameSpan.textContent = "Ошибка загрузки";
            }
            currentModelId = null;
            availableModels = {};
        }
    };
    if (modelSelectorButton && modelPopup && currentModelNameSpan && modelListUl) {
        loadAndPopulateModels().then(() => {
            modelSelectorButton.addEventListener('click', (event) => { event.stopPropagation(); const isHidden = modelPopup.classList.toggle('hidden'); modelSelectorButton.classList.toggle('open', !isHidden); if (!isHidden) { updateModelList(); } });
            document.addEventListener('click', (event) => { if (!modelPopup.classList.contains('hidden') && !modelSelectorButton.contains(event.target) && !modelPopup.contains(event.target)) { modelPopup.classList.add('hidden'); modelSelectorButton.classList.remove('open'); } });
        }).catch(error => { console.error("Критическая ошибка при инициализации селектора моделей:", error); if(currentModelNameSpan) currentModelNameSpan.textContent = "Ошибка!"; });
    } else { console.error("Ключевые элементы селектора моделей не найдены при инициализации обработчиков."); if(currentModelNameSpan) currentModelNameSpan.textContent = "Ошибка UI"; }

    // --- Инициализация состояния сайдбара при загрузке ---
    if (appContainer) {
        const savedState = localStorage.getItem('sidebarCollapsed');
        const shouldBeCollapsed = savedState === 'true';
        appContainer.classList.toggle('sidebar-collapsed', shouldBeCollapsed);
        updateSidebarToggleIcons(shouldBeCollapsed);
    } else { console.error("App container not found during initial state setup."); }

    // --- Логика кнопки СКРЫТИЯ/ОТКРЫТИЯ сайдбара на ДЕСКТОПЕ ---
    if (appContainer && desktopSidebarToggle) {
        desktopSidebarToggle.addEventListener('click', () => {
            const isCollapsed = appContainer.classList.toggle('sidebar-collapsed');
            localStorage.setItem('sidebarCollapsed', isCollapsed);
            updateSidebarToggleIcons(isCollapsed);
        });
    } else { console.error("App container or #desktop-sidebar-toggle not found."); }

    if (appContainer && openSidebarBtn) {
        openSidebarBtn.addEventListener('click', () => {
            if (window.innerWidth > 768) { // Только на десктопе
                appContainer.classList.remove('sidebar-collapsed');
                localStorage.setItem('sidebarCollapsed', 'false');
                updateSidebarToggleIcons(false);
            }
        });
    } else { console.error("App container or #open-sidebar-btn not found."); }

    // --- Вспомогательные функции ---
    const setLoadingState = (loading, element = null) => { /* Можно добавить визуальные индикаторы, если нужно */ };
    const closeConfirmationModal = () => { const overlay = document.getElementById('delete-confirm-overlay'); if (overlay) overlay.remove(); };
    const cancelAllActiveEdits = () => { document.querySelectorAll('.message-container.editing').forEach(container => { if (typeof handleCancelEdit === 'function') handleCancelEdit(container); }); };
    const cancelAllActiveRenames = () => { document.querySelectorAll('.chat-history-item.editing .rename-input').forEach(input => { if (typeof finishRename === 'function') finishRename(input, true); }); };

    // --- Меню опций чата ---
    const closeAllChatOptionMenus = () => { document.querySelectorAll('.chat-options-popup').forEach(menu => menu.remove()); document.querySelectorAll('.chat-options-btn.menu-active').forEach(btn => btn.classList.remove('menu-active')); };
    const toggleChatOptionsMenu = (buttonElement, chatId, chatTitle) => {
        const wasActive = buttonElement.classList.contains('menu-active'); closeAllChatOptionMenus(); if (wasActive) return;
        buttonElement.classList.add('menu-active'); const menu = document.createElement('div'); menu.className = 'chat-options-popup'; menu.dataset.chatId = chatId; const ul = document.createElement('ul');
        const renameLi = document.createElement('li'); renameLi.innerHTML = `<i data-feather="edit-2"></i><span>Переименовать</span>`;
        renameLi.addEventListener('click', (e) => { e.stopPropagation(); closeAllChatOptionMenus(); handleRenameChat(chatId, chatTitle); }); ul.appendChild(renameLi);
        const deleteLi = document.createElement('li'); deleteLi.className = 'delete-option'; deleteLi.innerHTML = `<i data-feather="trash-2"></i><span>Удалить чат</span>`;
        deleteLi.addEventListener('click', (e) => { e.stopPropagation(); closeAllChatOptionMenus(); showDeleteChatConfirmationModal(chatId, chatTitle); }); ul.appendChild(deleteLi);
        menu.appendChild(ul); document.body.appendChild(menu);
        const buttonRect = buttonElement.getBoundingClientRect(); menu.style.position = 'absolute'; menu.style.top = `${buttonRect.bottom + window.scrollY + 5}px`;
        menu.style.left = `${buttonRect.right + window.scrollX - menu.offsetWidth}px`; if (menu.getBoundingClientRect().left < 0) { menu.style.left = `${buttonRect.left + window.scrollX}px`; }
        try { feather.replace({'stroke-width': 2}); } catch(e) {} // <-- FIX: Перерисовка иконок меню
        setTimeout(() => { document.addEventListener('click', handleClickOutsideMenu, true); }, 0);
    };
    const handleClickOutsideMenu = (event) => { const openMenu = document.querySelector('.chat-options-popup'); const clickedOnButton = event.target.closest('.chat-options-btn.menu-active'); if (openMenu && !openMenu.contains(event.target) && !clickedOnButton) { closeAllChatOptionMenus(); document.removeEventListener('click', handleClickOutsideMenu, true); } };

    // --- Переименование чата ---
    const handleRenameChat = (chatId, currentTitle) => {
        const chatItemElement = document.querySelector(`.chat-history-item[data-chat-id="${chatId}"]`); const titleSpan = chatItemElement?.querySelector('.chat-title');
        if (!chatItemElement || !titleSpan || chatItemElement.classList.contains('editing')) return; cancelAllActiveRenames();
        const input = document.createElement('input'); input.type = 'text'; input.className = 'rename-input'; input.value = currentTitle; input.dataset.originalTitle = currentTitle;
        titleSpan.parentNode.insertBefore(input, titleSpan); chatItemElement.classList.add('editing'); input.focus(); input.select();
        input.addEventListener('blur', handleRenameInputBlur); input.addEventListener('keydown', handleRenameInputKeyDown);
    };
    const handleRenameInputBlur = (event) => { finishRename(event.target); };
    const handleRenameInputKeyDown = (event) => { if (event.key === 'Enter') { event.preventDefault(); finishRename(event.target); } else if (event.key === 'Escape') { event.preventDefault(); finishRename(event.target, true); } };
    const finishRename = async (inputElement, cancel = false) => {
        const chatItemElement = inputElement.closest('.chat-history-item'); const titleSpan = chatItemElement?.querySelector('.chat-title'); const chatId = chatItemElement?.dataset.chatId; const originalTitle = inputElement.dataset.originalTitle; const newTitle = inputElement.value.trim();
        inputElement.removeEventListener('blur', handleRenameInputBlur); inputElement.removeEventListener('keydown', handleRenameInputKeyDown); inputElement.remove(); chatItemElement?.classList.remove('editing');
        if (!chatItemElement || !titleSpan || !chatId) return;
        if (cancel || !newTitle || newTitle === originalTitle) { titleSpan.textContent = originalTitle; return; }
        titleSpan.textContent = newTitle; const optionsButton = chatItemElement.querySelector('.chat-options-btn'); if (optionsButton) optionsButton.dataset.chatTitle = newTitle;
        try {
            const response = await fetch(`/api/v1/chats/${chatId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTitle }) });
            if (!response.ok) { titleSpan.textContent = originalTitle; if (optionsButton) optionsButton.dataset.chatTitle = originalTitle; const errorData = await response.json().catch(() => ({})); console.error(`Ошибка сохранения названия чата: ${errorData.detail || response.status}`); }
            else { const updatedChat = await response.json();
                        // --- >>> ДОБАВЛЕНО: Обновляем историю чатов после успешного переименования <<< ---
        // Хотя это не меняет порядок по активности, но обновляет заголовок в списке
        console.log("finishRename: Успешно, обновляем список чатов...");
        loadChatHistory();
        titleSpan.textContent = updatedChat.title; if (optionsButton) optionsButton.dataset.chatTitle = updatedChat.title; console.log(`Чат ${chatId} переименован в "${updatedChat.title}"`); }
        } catch (error) { titleSpan.textContent = originalTitle; if (optionsButton) optionsButton.dataset.chatTitle = originalTitle; console.error("Сетевая ошибка при переименовании чата:", error); }
    };

    // --- Подтверждение удаления ЧАТА ---
    const showDeleteChatConfirmationModal = (chatId, chatTitle) => {
        closeConfirmationModal(); const overlay = document.createElement('div'); overlay.id = 'delete-confirm-overlay'; overlay.className = 'modal-overlay'; const modal = document.createElement('div'); modal.id = 'delete-confirm-modal'; modal.className = 'confirmation-modal';
        const titleEl = document.createElement('h3'); titleEl.textContent = 'Удалить чат?'; modal.appendChild(titleEl); const messageEl = document.createElement('p'); messageEl.textContent = `Вы уверены, что хотите удалить чат "${chatTitle || 'Без названия'}"? Это действие необратимо.`; modal.appendChild(messageEl);
        const buttonContainer = document.createElement('div'); buttonContainer.className = 'modal-button-container'; const cancelButton = document.createElement('button'); cancelButton.textContent = 'Отмена'; cancelButton.className = 'modal-button cancel'; cancelButton.onclick = closeConfirmationModal; buttonContainer.appendChild(cancelButton);
        const deleteButton = document.createElement('button'); deleteButton.textContent = 'Удалить'; deleteButton.className = 'modal-button delete';
        deleteButton.onclick = async () => {
             closeConfirmationModal();
             try {
                 const response = await fetch(`/api/v1/chats/${chatId}`, { method: 'DELETE' });
                 if (response.ok || response.status === 204) { const chatItemElement = document.querySelector(`.chat-history-item[data-chat-id="${chatId}"]`); if (chatItemElement) chatItemElement.remove(); if (String(currentChatId) === String(chatId)) { startNewChat(); } }
                 else { const errorData = await response.json().catch(() => ({})); alert(`Ошибка удаления чата: ${errorData.detail || response.status}`); }
             } catch (error) { console.error("Сетевая ошибка при удалении чата:", error); alert(`Сетевая ошибка при удалении чата: ${error}`); }
        };
        buttonContainer.appendChild(deleteButton); modal.appendChild(buttonContainer); overlay.appendChild(modal); document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeConfirmationModal(); });
    };

    // --- Логика временного чата ---
    if (tempChatCheckbox) {
        isTempChat = tempChatCheckbox.checked;
        tempChatCheckbox.addEventListener('change', () => { isTempChat = tempChatCheckbox.checked; startNewChat(true); }); // Добавили true для isModeSwitch
    } else { console.error("Temporary chat checkbox not found."); }

    // --- Автовысота поля ввода ---
    const adjustInputHeight = () => { if (!messageInput) return; messageInput.style.height = 'auto'; const maxHeight = 200; const newHeight = Math.min(messageInput.scrollHeight, maxHeight); messageInput.style.height = `${newHeight}px`; };

    // --- Очистка области чата и состояний ---
    const clearChatArea = (clearHistory = true) => { if (chatMessagesContainer) chatMessagesContainer.innerHTML = ''; if (messageInput) messageInput.value = ''; adjustInputHeight(); if (clearHistory) temporaryChatHistory = []; hideLoadingIndicator(); checkAndShowPlaceholder(); };

    // --- Управление историей чатов (Сайдбар) ---
    const setActiveChat = (chatId) => { document.querySelectorAll('.chat-history-item').forEach(item => item.classList.remove('active')); currentChatId = chatId; if (chatId !== null) { const activeItem = document.querySelector(`.chat-history-item[data-chat-id="${chatId}"]`); if (activeItem) activeItem.classList.add('active'); } if (!isTempChat) temporaryChatHistory = []; };
    const loadChatMessages = async (chatId) => {
        if (!chatArea || !chatMessagesContainer || isTempChat || chatId === null || chatId <= 0) return;
        isLoading = true; updateSendButtonState(); clearChatArea(false); showLoadingIndicator();
        try {
            const response = await fetch(`/api/v1/chats/${chatId}`); hideLoadingIndicator(); if (!response.ok) throw new Error(`Ошибка загрузки чата: ${response.status}`);
            const chatData = await response.json();
            if (chatData.messages && chatData.messages.length > 0) {
                chatData.messages.forEach(msg => displayMessage(msg.content, msg.role, msg.id, msg.chat_id, false, false, null));
                // Оборачиваем таблицы после загрузки всех сообщений
                setTimeout(() => {
                    if (typeof wrapTables === 'function') {
                        wrapTables(chatMessagesContainer);
                    }
                }, 100);
                // Дополнительная попытка с большей задержкой
                setTimeout(() => {
                    if (typeof wrapTables === 'function') {
                        console.log('loadChatMessages: Повторная попытка обернуть таблицы через 500мс');
                        wrapTables(chatMessagesContainer);
                    }
                }, 500);
            }
            else { checkAndShowPlaceholder(); }
        } catch (error) { hideLoadingIndicator(); console.error("Ошибка загрузки сообщений чата:", error); displayMessage(genericErrorMessage, 'system', null, chatId, false, true, `temp-${Date.now()}-error`); checkAndShowPlaceholder(); }
        finally { isLoading = false; updateSendButtonState(); setTimeout(() => scrollToBottom(true), 100); }
    };
    const loadAndDisplayChat = (chatId) => {
        if (isLoading || isGeneratingResponse) { console.log("Загрузка/генерация активна, переключение чата отменено."); return; }
        cancelAllActiveRenames(); cancelAllActiveEdits();
        if (isTempChat) { isTempChat = false; if(tempChatCheckbox) tempChatCheckbox.checked = false; temporaryChatHistory = []; }
        setActiveChat(chatId); loadChatMessages(chatId);
        if (window.innerWidth <= 768) closeSidebar();
    };
    const createChatItem = (chat) => {
        const item = document.createElement('div'); item.className = 'chat-history-item'; item.dataset.chatId = chat.id; item.classList.toggle('active', String(chat.id) === String(currentChatId));
        const titleSpan = document.createElement('span'); titleSpan.className = 'chat-title'; titleSpan.textContent = chat.title || "Без названия"; item.appendChild(titleSpan);
        const actionsDiv = document.createElement('div'); actionsDiv.className = 'chat-actions';
        const optionsButton = document.createElement('button'); optionsButton.className = 'icon-button chat-options-btn'; optionsButton.title = 'Опции чата'; optionsButton.dataset.chatTitle = chat.title || "Без названия"; optionsButton.innerHTML = '<i data-feather="more-horizontal"></i>';
        optionsButton.addEventListener('click', (e) => { e.stopPropagation(); toggleChatOptionsMenu(e.currentTarget, chat.id, e.currentTarget.dataset.chatTitle); });
        actionsDiv.appendChild(optionsButton); item.appendChild(actionsDiv);
        item.addEventListener('click', (e) => { if (e.target.closest('.chat-options-btn')) return; loadAndDisplayChat(chat.id); });
        return item;
     };
     const renderChatHistory = (chats, element) => {
        element.innerHTML = ''; // Очищаем перед рендерингом
        if (!chats || chats.length === 0) {
        element.innerHTML = '<div class="history-group-title">Нет сохраненных чатов</div>';
        return;
        }
        // Просто рендерим чаты в том порядке, в котором они пришли (отсортированы сервером)
        chats.forEach(chat => element.appendChild(createChatItem(chat)));
        setActiveChat(currentChatId); // Переустанавливаем активный чат
        try { feather.replace({'stroke-width': 2}); } catch(e) {} // Обновляем иконки
        };
        const loadChatHistory = async () => {
            console.log("loadChatHistory: Начало загрузки истории чатов");
            if (!chatListElement) return;
            
            // Устанавливаем таймаут для запроса
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд таймаут
            
            try {
                console.log("loadChatHistory: Отправка запроса к /api/v1/chats/?limit=200");
                const response = await fetch('/api/v1/chats/?limit=200', { signal: controller.signal });
                clearTimeout(timeoutId);
                
                if (!response.ok) throw new Error(`Ошибка сети: ${response.status}`);
                const chats = await response.json();
                console.log(`loadChatHistory: Получено ${chats.length} чатов`);
        
                searchableChatList = chats; // <--- ADD THIS LINE: Store the fetched chats
        
                chatListElement.innerHTML = ''; // Очищаем текущий список
                if (chats.length === 0) {
                    chatListElement.innerHTML = '<div class="history-group-title">Нет сохраненных чатов</div>';
                } else {
                    renderChatHistory(chats, chatListElement); // Рендерим полученный список
                }
                console.log("loadChatHistory: Успешно завершено");
            } catch (error) {
                clearTimeout(timeoutId);
                searchableChatList = []; // <--- ADD THIS LINE: Clear on error too
                
                if (error.name === 'AbortError') {
                    console.error("loadChatHistory: Таймаут запроса (10 секунд)");
                    chatListElement.innerHTML = `<div class="history-group-title" style="color: var(--error-color);">Таймаут загрузки истории</div>`;
                } else {
                    console.error("loadChatHistory: Ошибка:", error);
                    chatListElement.innerHTML = `<div class="history-group-title" style="color: var(--error-color);">Ошибка загрузки истории</div>`;
                }
            }
        };
    const updateNewChatTitle = async (chatId, userQuery, aiResponse) => {
        const chatItem = chatListElement?.querySelector(`.chat-history-item[data-chat-id="${chatId}"]`); const titleSpan = chatItem?.querySelector('.chat-title'); const optionsButton = chatItem?.querySelector('.chat-options-btn');
        if (!chatItem || !titleSpan || !titleSpan.textContent.startsWith("Новый чат")) { return; }
        let newTitle = aiResponse.split(/[.!?\\n]/)[0].trim(); if (!newTitle || newTitle.length < 5 || newTitle.length > 50) { newTitle = userQuery.substring(0, 50) + (userQuery.length > 50 ? '...' : ''); } newTitle = newTitle.substring(0, 50);
        if (newTitle && newTitle !== titleSpan.textContent) {
            titleSpan.textContent = newTitle; if (optionsButton) optionsButton.dataset.chatTitle = newTitle;
            fetch(`/api/v1/chats/${chatId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTitle }) }) .then(response => { if (!response.ok) { console.warn(`Не удалось автоматически обновить название чата ${chatId} на сервере.`); } else { console.log(`Автоматически обновлено название чата ${chatId} на "${newTitle}"`); } }) .catch(err => { console.warn(`Сетевая ошибка при авто-обновлении названия чата ${chatId}:`, err); });
        }
    };

    // --- ИСПРАВЛЕННАЯ startNewChat ---
    const startNewChat = (isModeSwitch = false) => {
        // --- FIX: Сброс флага остановки и проверка на активную генерацию ---
        stopGenerationRequested = false; // Всегда сбрасываем флаг при начале нового чата
        if (isGeneratingResponse) {
            console.log("startNewChat: Идет генерация, останавливаем...");
            isGeneratingResponse = false; // Принудительно останавливаем
            isLoading = false;
            hideLoadingIndicator();
            displayMessage("Генерация прервана для начала нового чата.", "system", null, null, true, false);
            // Не вызываем updateSendButtonState() здесь, он вызовется ниже
        } else if (!isModeSwitch && isLoading) {
            // Прерываем только если НЕ переключаем режим и идет другая загрузка
            console.log("startNewChat: Идет фоновая загрузка, 'Новый чат' отменен.");
            return;
        }
        // --- КОНЕЦ FIX ---

        cancelAllActiveRenames(); cancelAllActiveEdits();
        setActiveChat(null); clearChatArea(true);
        updateSendButtonState(); // Обновляем кнопку ПОСЛЕ всех сбросов
        if(tempChatCheckbox) { tempChatCheckbox.checked = isTempChat; }
        console.log(`Начат новый чат (Режим Инкогнито: ${isTempChat})`);
        if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('open')) { closeSidebar(); }
        // --- FIX: Принудительно прокручиваем вниз, чтобы увидеть плейсхолдер ---
        setTimeout(() => scrollToBottom(true), 50);
    };

    // Назначаем обработчик на ОБЕ кнопки "Новый чат"
    const newChatButtonSidebar = document.getElementById('new-chat-btn');
    const newChatButtonHeader = document.getElementById('new-chat-btn-header');
    if (newChatButtonSidebar) { newChatButtonSidebar.addEventListener('click', () => startNewChat(false)); } // isModeSwitch = false
    else { console.error("#new-chat-btn (sidebar) не найден."); }
    if (newChatButtonHeader) { newChatButtonHeader.addEventListener('click', () => startNewChat(false)); } // isModeSwitch = false
    else { console.error("#new-chat-btn-header не найден."); }


    // --- Редактирование/Регенерация/Удаление сообщений (Функции без изменений, но проверим вызовы) ---
    // (handleEditMessage, handleCancelEdit, handleSaveEdit, handleRegenerateMessage, handleDeleteMessage, showDeleteMessageConfirmation)
    // ... (Код этих функций без изменений) ...

    // --- ИСПРАВЛЕННАЯ handleEditMessage ---
    const handleEditMessage = (messageContainer) => {
        if (isGeneratingResponse || isLoading) {
            console.warn("handleEditMessage: Попытка редактирования во время загрузки/генерации.");
            return;
        }
        if (!messageContainer.classList.contains('editing')) { cancelAllActiveEdits(); } else { return; }
        if (!messageContainer || !messageContainer.classList.contains('user-message')) return;

        const tempId = messageContainer.dataset.tempId;
        const messageBubble = messageContainer.querySelector('.message-bubble');
        const originalContent = messageBubble?.textContent;

        if (!messageBubble || originalContent === undefined) { console.error("handleEditMessage: Не найден бабл сообщения или его контент."); return; }
        if (!tempId) { console.error(`handleEditMessage: Отсутствует tempId у сообщения! Невозможно начать редактирование.`, messageContainer.dataset); alert("Невозможно отредактировать это сообщение (ошибка внутреннего ID)."); return; }

        console.log(`handleEditMessage: tempId (${tempId}) найден, разрешаем открытие редактора.`);

        const editorDiv = document.createElement('div'); editorDiv.className = 'message-editor';
        const textarea = document.createElement('textarea'); textarea.className = 'message-editor-textarea'; textarea.value = originalContent;
        textarea.addEventListener('input', () => { textarea.style.height = 'auto'; textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px`; });
        // Добавляем обработку Ctrl+Enter для сохранения
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                e.stopPropagation();
                if (!isLoading && !isGeneratingResponse) {
                    handleSaveEdit(messageContainer, textarea);
                }
            }
        });
        setTimeout(() => { textarea.style.height = 'auto'; textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px`; }, 0);

        const controlsDiv = document.createElement('div'); controlsDiv.className = 'message-editor-controls';
        const cancelButton = createActionButton('x', 'Отмена', 'cancel'); cancelButton.classList.remove('icon-button', 'message-action-button'); cancelButton.classList.add('message-editor-button'); cancelButton.innerHTML = `<i data-feather="x"></i> Отмена`;
        cancelButton.onclick = (e) => { e.stopPropagation(); handleCancelEdit(messageContainer); };

        const saveButton = createActionButton('check', 'Сохранить и отправить', 'save'); saveButton.classList.remove('icon-button', 'message-action-button'); saveButton.classList.add('message-editor-button'); saveButton.innerHTML = `<i data-feather="check"></i> Сохранить и отправить`;
        // --- FIX: Проверка флагов перед сохранением ---
        saveButton.onclick = (e) => { e.stopPropagation(); if (!isLoading && !isGeneratingResponse) handleSaveEdit(messageContainer, textarea); };

        controlsDiv.appendChild(cancelButton); controlsDiv.appendChild(saveButton);
        editorDiv.appendChild(textarea); editorDiv.appendChild(controlsDiv);
        messageBubble.parentNode.insertBefore(editorDiv, messageBubble.nextSibling);
        messageContainer.classList.add('editing'); textarea.focus(); textarea.select();
        try { feather.replace({'stroke-width': 2.2}); } catch(err){} // <-- FIX: Перерисовка иконок редактора
    };

    // --- ИСПРАВЛЕННАЯ handleCancelEdit ---
    const handleCancelEdit = (messageContainer) => {
         if (!messageContainer) return;
         const editorDiv = messageContainer.querySelector('.message-editor');
         if (editorDiv) editorDiv.remove();
         messageContainer.classList.remove('editing');
         // --- FIX: Убедимся, что кнопки действий снова видны (если применимо) ---
         const actions = messageContainer.querySelector('.message-actions');
         if (actions) actions.style.display = ''; // Сбрасываем стиль display
    };

/**
 * Обрабатывает сохранение отредактированного сообщения пользователя.
 */
const handleSaveEdit = async (messageContainer, textarea) => {
    const logPrefix = "handleSaveEdit:";

    // Проверяем флаг остановки в самом начале
    if (stopGenerationRequested) {
        console.log(`${logPrefix} Операция была остановлена ранее (stopGenerationRequested=true), отменяем редактирование.`);
        handleCancelEdit(messageContainer); // Просто закрываем редактор
        // stopGenerationRequested сбросится в finally предыдущей операции или при старте новой
        return;
    }

    // Проверяем, не идет ли ДРУГАЯ операция генерации или загрузки
    if (isGeneratingResponse || isLoading) {
        console.warn(`${logPrefix} Попытка запустить во время другой активной операции (isGeneratingResponse=${isGeneratingResponse}, isLoading=${isLoading}).`);
        return;
    }

    const newContent = textarea.value.trim();
    const messageId = messageContainer.dataset.messageId; // ID из БД
    const chatIdFromMessage = messageContainer.dataset.chatId; // ID чата из БД (у сообщения)
    const tempId = messageContainer.dataset.tempId; // Временный UI ID
    const originalBubble = messageContainer.querySelector('.message-bubble');
    const originalContent = originalBubble?.textContent;

    if (!newContent) {
        alert("Сообщение не может быть пустым.");
        return;
    }
    if (!tempId) {
        console.error(`${logPrefix} Нет tempId у редактируемого сообщения! Невозможно продолжить.`);
        handleCancelEdit(messageContainer);
        alert("Критическая ошибка: не удалось определить ID сообщения для редактирования.");
        return;
    }

    let actionType = null;
    const isMessageIdValid = messageId && messageId !== 'null' && messageId !== 'undefined';
    const isChatIdFromMessageValid = chatIdFromMessage && chatIdFromMessage !== 'null' && chatIdFromMessage !== 'undefined';
    const isCurrentChatIdValid = currentChatId && currentChatId > 0;

    if (isTempChat) {
        actionType = 'temp_regenerate_with_new_history';
    } else { // Постоянный чат
        if (isMessageIdValid && isChatIdFromMessageValid) {
            actionType = 'permanent_update_and_regenerate';
        } else if (isCurrentChatIdValid) {
            actionType = 'permanent_send_as_new';
            console.log(`${logPrefix} Сообщение (tempId: ${tempId}) не имеет messageId/chatId, будет отправлено как новое в текущий чат ${currentChatId}.`);
        } else {
            console.error(`${logPrefix} (Permanent Chat) Невалидные ID у сообщения (messageId: ${messageId}, chatId: ${chatIdFromMessage}) И нет активного currentChatId (${currentChatId}). Невозможно определить действие.`);
            if (originalBubble && originalContent !== undefined) originalBubble.textContent = originalContent;
            handleCancelEdit(messageContainer);
            alert("Не удалось сохранить изменения (ошибка определения ID чата).");
            return;
        }
    }
    console.log(`${logPrefix} Определен тип действия: ${actionType}`);

    // Удаляем предыдущее сообщение об остановке/ошибке
    const lastStopNotification = chatMessagesContainer.querySelector('.message-container.stop-notification-message:last-of-type');
    if (lastStopNotification) lastStopNotification.remove();
    const lastError = chatMessagesContainer.querySelector('.message-container.error-message:last-of-type');
    if (lastError) lastError.remove();


    // --- Логика для 'permanent_send_as_new' ---
    if (actionType === 'permanent_send_as_new') {
        console.log(`${logPrefix} Отправка "${newContent}" как НОВОГО сообщения в постоянный чат ID ${currentChatId}`);
        handleCancelEdit(messageContainer); // Закрываем редактор у старого сообщения
        messageContainer.remove();          // Удаляем старый элемент сообщения из UI
        checkAndShowPlaceholder();

        // sendMessageInternal управляет флагами isLoading/isGeneratingResponse и UI
        await sendMessageInternal(newContent, null); // null для historyOverride, т.к. это новое сообщение
        return; // Выходим, так как sendMessageInternal завершит операцию
    }

    // --- Общая логика для 'temp_regenerate_with_new_history' и 'permanent_update_and_regenerate' ---

    // Оптимистично обновляем текст бабла в UI и закрываем редактор
    if (originalBubble) originalBubble.textContent = newContent;
    handleCancelEdit(messageContainer);

    // Удаляем все сообщения ПОСЛЕ редактируемого элемента в UI
    let elementToRemove = messageContainer.nextElementSibling;
    const elementsToRemoveFromUI = [];
    while (elementToRemove) {
        if (elementToRemove.classList.contains('message-container')) {
            elementsToRemoveFromUI.push(elementToRemove);
        }
        elementToRemove = elementToRemove.nextElementSibling;
    }
    elementsToRemoveFromUI.forEach(el => {
         if (isTempChat && el.dataset.tempId) {
             const idx = temporaryChatHistory.findIndex(m => m.tempId === el.dataset.tempId);
             if (idx > -1) {
                 console.log(`${logPrefix} Удаление из temp history (UI cleanup): ${el.dataset.tempId}`);
                 temporaryChatHistory.splice(idx, 1);
             }
         }
         el.remove();
    });
    console.log(`${logPrefix} Удалено ${elementsToRemoveFromUI.length} сообщений из UI после редактируемого.`);

    // Обновляем временную историю (только для 'temp_regenerate_with_new_history')
    let historyForTempRegen = null;
    if (actionType === 'temp_regenerate_with_new_history') {
         const editedMessageIndex = temporaryChatHistory.findIndex(m => m.tempId === tempId);
         if (editedMessageIndex > -1) {
             temporaryChatHistory[editedMessageIndex].content = newContent; // Обновляем контент
             // Удаляем все последующие элементы из ИСТОРИИ
             if (temporaryChatHistory.length > editedMessageIndex + 1) {
                 const removedFromHistoryCount = temporaryChatHistory.length - (editedMessageIndex + 1);
                 temporaryChatHistory.splice(editedMessageIndex + 1);
                 console.log(`${logPrefix} (Temp History) Удалено ${removedFromHistoryCount} элементов после ${tempId}`);
             }
             // Готовим историю ДО отредактированного сообщения (не включая его)
             historyForTempRegen = temporaryChatHistory.slice(0, editedMessageIndex)
                                      .map(({ role, content }) => ({ role, content }));
         } else {
             console.error(`${logPrefix} КРИТИЧЕСКАЯ ОШИБКА: tempId ${tempId} не найден во временной истории для обновления!`);
             alert("Критическая ошибка: не удалось обновить историю чата для редактирования.");
             // Восстанавливаем оригинальный контент, если возможно
             if (originalBubble && originalContent !== undefined) originalBubble.textContent = originalContent;
             return; // Прерываем операцию
         }
    }

    // --- Выполнение запроса ---
    let caughtError = null;
    let requestErrorOccurred = false;

    // Сброс AbortController перед новой операцией (если это не 'permanent_update_and_regenerate',
    // где sendMessageInternal сама это сделает)
    if (actionType !== 'permanent_update_and_regenerate' && currentAbortController) {
        currentAbortController.abort('New edit operation started');
        currentAbortController = null;
    }

    try {
        // Проверяем флаг остановки перед асинхронной операцией
        if (stopGenerationRequested) throw new Error("Operation stopped by user before async call in handleSaveEdit");

        if (actionType === 'temp_regenerate_with_new_history') {
             console.log(`${logPrefix} Регенерация ответа для временного чата после редактирования...`);
             // `newContent` - это текст отредактированного сообщения пользователя.
             // `historyForTempRegen` - история ДО этого сообщения.
             // sendMessageInternal сама установит флаги isLoading/isGeneratingResponse.
             await sendMessageInternal(newContent, historyForTempRegen);
        } else { // actionType === 'permanent_update_and_regenerate'
             console.log(`${logPrefix} (Permanent Update & Regen): Обновление сообщения и регенерация через стриминг...`);
             
             // Сначала обновляем сообщение в БД
             const effectiveChatId = chatIdFromMessage || currentChatId;
             if (!effectiveChatId || !isMessageIdValid) {
                throw new Error(`Invalid IDs for permanent_update_and_regenerate: chatId=${effectiveChatId}, messageId=${messageId}`);
             }
             
             // Обновляем сообщение через API
             const updateResponse = await fetch(`/api/v1/chats/${effectiveChatId}/messages/${messageId}`, {
                 method: 'PUT',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ content: newContent })
             });
             
             if (!updateResponse.ok) {
                 throw new Error(`Failed to update message: ${updateResponse.status}`);
             }
             
             // Собираем историю из видимых элементов UI (до отредактированного сообщения включительно)
             let historyOverride = [];
             const allMessages = chatMessagesContainer.querySelectorAll('.message-container');
             for (const el of allMessages) {
                 // Останавливаемся после текущего отредактированного сообщения
                 const role = el.classList.contains('user-message') ? 'user' : 'assistant';
                 const contentEl = el.querySelector('.message-bubble, .message-content');
                 const content = contentEl ? contentEl.textContent.trim() : '';
                 if (content) {
                     historyOverride.push({ role, content });
                 }
                 if (el === messageContainer) break;
             }
             
             console.log(`${logPrefix} Собрана история из UI: ${historyOverride.length} сообщений`);
             
             // Используем sendMessageInternal для стриминговой регенерации
             await sendMessageInternal(newContent, historyOverride);
        }
    } catch (error) {
        caughtError = error;
        console.error(`${logPrefix} Ошибка в try/catch:`, error);

        // Если ошибка произошла в блоке 'permanent_update_and_regenerate'
        if (actionType === 'permanent_update_and_regenerate') {
            hideLoadingIndicator();
            if (originalBubble && originalContent !== undefined && !(error && error.name === 'AbortError')) {
                originalBubble.textContent = originalContent; // Восстанавливаем текст
            }
            // Отображаем ошибку, если она еще не была и это не AbortError
            if (!requestErrorOccurred && !(error && error.name === 'AbortError') && !document.querySelector('.message-container.error-message')) {
                 const errorChatId = chatIdFromMessage || currentChatId;
                 displayMessage(genericErrorMessage, 'assistant', null, errorChatId, false, true, `temp-${Date.now()}-error-save-perm`);
            }
            isLoading = false; isGeneratingResponse = false; // Гарантированно сбрасываем флаги
        }
        // Если ошибка произошла в 'temp_regenerate_with_new_history', то она была либо из sendMessageInternal
        // (которая сама обработала флаги), либо до ее вызова.
        // Если ДО вызова, то флаги еще не были установлены.
        // Если ИЗ вызова, то они уже сброшены.
        // На всякий случай, если ошибка была локальной до вызова sendMessageInternal:
        else if (actionType === 'temp_regenerate_with_new_history' && !(error && error.message?.includes("sendMessageInternal"))) {
            isLoading = false; isGeneratingResponse = false; // Сбрасываем, если ошибка была локальной
            if (originalBubble && originalContent !== undefined) originalBubble.textContent = originalContent;
             if (!requestErrorOccurred && !document.querySelector('.message-container.error-message')) {
                 displayMessage(genericErrorMessage, 'assistant', null, 0, false, true, `temp-${Date.now()}-error-save-temp`);
             }
        }
    } finally {
        // Обновляем UI кнопки и плейсхолдер, если это был 'permanent_update_and_regenerate'
        // или если это был другой actionType, и sendMessageInternal не была вызвана (из-за ошибки до нее)
        // или если sendMessageInternal завершилась (она сама обновит в своем finally).
        // Проще всего просто вызвать, т.к. sendMessageInternal.finally это сделает еще раз, но это не страшно.
        updateSendButtonState();
        checkAndShowPlaceholder();

        console.log(`${logPrefix} (${actionType}) finally: Завершение.`);
        setTimeout(() => scrollToBottom(true), 50);
    }
};

/**
 * Обрабатывает регенерацию ответа ассистента.
 */
const handleRegenerateMessage = async (messageContainer) => {
    const logPrefix = "handleRegenerateMessage:";

    if (stopGenerationRequested) {
        console.log(`${logPrefix} Остановка запрошена пользователем, регенерация отменена.`);
        // stopGenerationRequested сбросится в finally предыдущей операции или при старте новой
        return;
    }
    if (isGeneratingResponse || isLoading) {
        console.warn(`${logPrefix} Попытка регенерации во время другой операции (isGeneratingResponse=${isGeneratingResponse}, isLoading=${isLoading}).`);
        return;
    }
    if (!messageContainer || !messageContainer.classList.contains('assistant-message') || messageContainer.classList.contains('error-message')) {
        console.warn(`${logPrefix} Некорректный элемент для регенерации.`);
        return;
    }

    if (!currentModelId) { // Используем текущую выбранную модель для регенерации
        alert("Ошибка: Модель AI не выбрана для регенерации.");
        console.error(`${logPrefix} currentModelId не установлен.`);
        return;
    }
    const modelIdToSend = currentModelId; // Модель, с которой будем регенерировать

    // ID регенерируемого сообщения AI
    const assistantMessageId = messageContainer.dataset.messageId;
    const assistantChatId = messageContainer.dataset.chatId;
    const assistantTempId = messageContainer.dataset.tempId; // Для временных чатов

    // Находим предыдущее сообщение пользователя
    let previousUserMessageElement = messageContainer.previousElementSibling;
    while(previousUserMessageElement && !previousUserMessageElement.classList.contains('user-message')) {
        previousUserMessageElement = previousUserMessageElement.previousElementSibling;
    }
    if (!previousUserMessageElement) {
        console.error(`${logPrefix} Не найдено предыдущее сообщение пользователя для регенерации.`);
        alert("Невозможно регенерировать: не найдено предыдущее сообщение пользователя.");
        return;
    }

    const prevUserMessageContent = previousUserMessageElement.querySelector('.message-bubble')?.textContent?.trim();
    const prevUserMessageId = previousUserMessageElement.dataset.messageId; // ID из БД
    const prevUserTempId = previousUserMessageElement.dataset.tempId;     // Временный UI ID

    if (!prevUserMessageContent) {
        console.error(`${logPrefix} Не удалось получить контент предыдущего сообщения пользователя.`);
        alert("Критическая ошибка: не удалось получить текст сообщения для регенерации.");
        return;
    }

    let actionType = null;
    if (isTempChat) {
        // Для временного чата нам нужен tempId предыдущего сообщения пользователя
        if (prevUserTempId) {
            actionType = 'temp_regenerate_from_user_message';
        } else {
            console.error(`${logPrefix} (Temp Chat) Отсутствует prevUserTempId. Невозможно регенерировать.`);
            alert("Ошибка регенерации во временном чате: отсутствует ID предыдущего сообщения.");
            return;
        }
    } else { // Постоянный чат
        // Нужны ID чата и ID сообщения ассистента, которое регенерируем
        const isAssistantMsgIdValid = assistantMessageId && assistantMessageId !== 'null' && assistantMessageId !== 'undefined';
        const isChatIdValid = assistantChatId && assistantChatId !== 'null' && assistantChatId !== 'undefined';
        if (isAssistantMsgIdValid && isChatIdValid) {
            actionType = 'permanent_regenerate_assistant_message';
        } else {
            console.error(`${logPrefix} (Permanent Chat) Отсутствуют или невалидны ID для регенерации (assistantMessageId: ${assistantMessageId}, assistantChatId: ${assistantChatId})`);
            alert("Ошибка регенерации: неверные ID сообщения или чата.");
            return;
        }
    }
    console.log(`${logPrefix} Определен тип действия: ${actionType}`);

    // Удаляем сообщение об остановке/ошибке
    const lastStopNotification = chatMessagesContainer.querySelector('.message-container.stop-notification-message:last-of-type');
    if (lastStopNotification) lastStopNotification.remove();
    const lastError = chatMessagesContainer.querySelector('.message-container.error-message:last-of-type');
    if (lastError) lastError.remove();

    // Удаляем все сообщения НАЧИНАЯ с регенерируемого AI сообщения из UI
    let elementToRemove = messageContainer;
    const elementsToRemoveFromUI = [];
    while (elementToRemove) {
        if (elementToRemove.classList.contains('message-container')) {
            elementsToRemoveFromUI.push(elementToRemove);
        }
        elementToRemove = elementToRemove.nextElementSibling;
    }
    elementsToRemoveFromUI.forEach(el => {
         if (isTempChat && el.dataset.tempId) {
             const idx = temporaryChatHistory.findIndex(m => m.tempId === el.dataset.tempId);
             if (idx > -1) {
                 console.log(`${logPrefix} Удаление из temp history (UI cleanup): ${el.dataset.tempId}`);
                 temporaryChatHistory.splice(idx, 1);
             }
         }
         el.remove();
    });
    console.log(`${logPrefix} Удалено ${elementsToRemoveFromUI.length} сообщений из UI начиная с регенерируемого.`);

    // Обрезаем временную историю до ПРЕДЫДУЩЕГО сообщения пользователя (включительно)
    let historyForTempRegen = null;
    if (actionType === 'temp_regenerate_from_user_message') {
        const prevUserMessageIndexInHistory = temporaryChatHistory.findIndex(m => m.tempId === prevUserTempId);
        if (prevUserMessageIndexInHistory > -1) {
            // Обрезаем историю так, чтобы она включала prevUserMessage, но не последующие
            if (temporaryChatHistory.length > prevUserMessageIndexInHistory + 1) {
                const removedFromHistoryCount = temporaryChatHistory.length - (prevUserMessageIndexInHistory + 1);
                temporaryChatHistory.splice(prevUserMessageIndexInHistory + 1);
                console.log(`${logPrefix} (Temp History) Удалено ${removedFromHistoryCount} элементов после сообщения пользователя ${prevUserTempId}`);
            }
            // История для API должна быть ДО сообщения пользователя
            historyForTempRegen = temporaryChatHistory.slice(0, prevUserMessageIndexInHistory)
                                    .map(({ role, content }) => ({ role, content }));
        } else {
            console.warn(`${logPrefix} (Temp Chat) Сообщение пользователя ${prevUserTempId} не найдено в истории. Регенерация будет с пустой историей до него.`);
            historyForTempRegen = []; // Пустая история, если не нашли (маловероятно)
        }
    }

    // --- Выполнение запроса ---
    let caughtError = null;
    let requestErrorOccurred = false;
    // Prepare history override for streaming regeneration (permanent chat)
    let historyOverride = null;
    if (actionType === 'permanent_regenerate_assistant_message') {
        historyOverride = [];
        const allMessages = chatMessagesContainer.querySelectorAll('.message-container:not(.stop-notification-message):not(.error-message):not(.loading-indicator-container)');
        for (const el of allMessages) {
            const role = el.classList.contains('user-message') ? 'user' : 'assistant';
            const contentEl = el.querySelector('.message-bubble, .message-content');
            const content = contentEl ? contentEl.textContent.trim() : '';
            if (content && !el.classList.contains('editing')) {
                historyOverride.push({ role, content });
            }
            // Останавливаемся ПОСЛЕ добавления предыдущего сообщения пользователя
            if (el === previousUserMessageElement) break;
        }
        console.log(`${logPrefix} Собрана история для регенерации: ${historyOverride.length} сообщений (включая сообщение пользователя)`);
    }
    // duplicate requestErrorOccurred removed to avoid redeclaration

    if (actionType !== 'permanent_regenerate_assistant_message' && currentAbortController) {
        currentAbortController.abort('New regenerate operation started');
        currentAbortController = null;
    }

    try {
        if (stopGenerationRequested) throw new Error("Operation stopped by user before async call in handleRegenerateMessage");

        if (actionType === 'temp_regenerate_from_user_message') {
            console.log(`${logPrefix} Регенерация ответа для временного чата на сообщение пользователя "${prevUserMessageContent}"...`);
            // `prevUserMessageContent` - текст сообщения пользователя, на которое регенерируем.
            // `historyForTempRegen` - история ДО этого сообщения пользователя.
            await sendMessageInternal(prevUserMessageContent, historyForTempRegen);
        } else { // actionType === 'permanent_regenerate_assistant_message'
            // Regeneration via streaming
            await sendMessageInternal(prevUserMessageContent, historyOverride);
        }
    } catch (error) {
        caughtError = error;
        console.error(`${logPrefix} Ошибка в try/catch:`, error);
        if (actionType === 'permanent_regenerate_assistant_message') {
            hideLoadingIndicator();
            if (!requestErrorOccurred && !(error && error.name === 'AbortError') && !document.querySelector('.message-container.error-message')) {
                 displayMessage(genericErrorMessage, 'assistant', null, assistantChatId, false, true, `temp-${Date.now()}-error-regen-perm`);
            }
            isLoading = false; isGeneratingResponse = false;
        } else if (actionType === 'temp_regenerate_from_user_message' && !(error && error.message?.includes("sendMessageInternal"))){
            isLoading = false; isGeneratingResponse = false;
             if (!requestErrorOccurred && !document.querySelector('.message-container.error-message')) {
                 displayMessage(genericErrorMessage, 'assistant', null, 0, false, true, `temp-${Date.now()}-error-regen-temp`);
             }
        }
    } finally {
        if (actionType === 'permanent_regenerate_assistant_message') {
            updateSendButtonState();
            checkAndShowPlaceholder();
        }
        console.log(`${logPrefix} (${actionType}) finally: Завершение.`);
        setTimeout(() => scrollToBottom(true), 50);
    }
};
    // --- Удаление Сообщения (универсальное) ---
    const handleDeleteMessage = async (messageContainer) => {
        // --- FIX: Проверяем флаги ---
        if (isGeneratingResponse || isLoading) { console.warn("handleDeleteMessage: Попытка удаления во время операции."); return; }
        if (!messageContainer || !messageContainer.isConnected) { console.warn("handleDeleteMessage: Элемент сообщения не найден."); return; }

        const messageId = messageContainer.dataset.messageId; const chatId = messageContainer.dataset.chatId; const tempId = messageContainer.dataset.tempId;

        if (isTempChat) {
            if (!tempId) { console.error("Нет tempId для удаления временного сообщения"); return; }
            const indexToRemove = temporaryChatHistory.findIndex(msg => msg.tempId === tempId);
            if (indexToRemove > -1) { temporaryChatHistory.splice(indexToRemove, 1); }
            else { console.warn("Не найдено сообщение с tempId", tempId, "в истории для удаления."); }
            messageContainer.remove(); checkAndShowPlaceholder(); scrollToBottom();
        } else {
            if (!messageId || !chatId) { console.error("Нет ID для удаления постоянного сообщения"); return; }
            showDeleteMessageConfirmation(chatId, messageId, messageContainer); // Показываем модалку
        }
    };

    // --- Подтверждение удаления СООБЩЕНИЯ ---
    const showDeleteMessageConfirmation = (chatId, messageId, messageElement) => {
        if (isGeneratingResponse || isLoading) return; closeConfirmationModal();
        const overlay = document.createElement('div'); overlay.id = 'delete-confirm-overlay'; overlay.className = 'modal-overlay'; const modal = document.createElement('div'); modal.id = 'delete-confirm-modal'; modal.className = 'confirmation-modal';
        const titleEl = document.createElement('h3'); titleEl.textContent = 'Удалить сообщение?'; modal.appendChild(titleEl);
        const messagePreview = messageElement?.querySelector('.message-bubble')?.textContent || messageElement?.querySelector('.message-content')?.textContent || '';
        const messageEl = document.createElement('p'); messageEl.textContent = `Вы уверены, что хотите удалить это сообщение?`;
        if (messagePreview) { messageEl.textContent += `\n\n"${messagePreview.substring(0, 70)}${messagePreview.length > 70 ? '...' : ''}"`; messageEl.style.whiteSpace = 'pre-wrap'; messageEl.style.wordBreak = 'break-word'; }
        modal.appendChild(messageEl);
        const buttonContainer = document.createElement('div'); buttonContainer.className = 'modal-button-container'; const cancelButton = document.createElement('button'); cancelButton.textContent = 'Отмена'; cancelButton.className = 'modal-button cancel'; cancelButton.onclick = closeConfirmationModal; buttonContainer.appendChild(cancelButton);
        const deleteButton = document.createElement('button'); deleteButton.textContent = 'Удалить'; deleteButton.className = 'modal-button delete';
        deleteButton.onclick = async () => {
             closeConfirmationModal();
             // --- FIX: Ставим isLoading на время удаления ---
             isLoading = true; updateSendButtonState();
             try {
                 const response = await fetch(`/api/v1/chats/${chatId}/messages/${messageId}`, { method: 'DELETE' });
                 if (response.ok || response.status === 204) { if (messageElement && messageElement.isConnected) messageElement.remove(); checkAndShowPlaceholder(); scrollToBottom(true); }
                 else { const errorData = await response.json().catch(() => ({ detail: 'Неизвестная ошибка удаления сообщения' })); alert(`Ошибка удаления сообщения: ${errorData.detail || response.status}`); }
             } catch (error) { console.error("Сетевая ошибка при удалении сообщения:", error); alert(`Сетевая ошибка при удалении сообщения: ${error}`); }
             finally { isLoading = false; updateSendButtonState(); } // Сбрасываем флаг
        };
        buttonContainer.appendChild(deleteButton); modal.appendChild(buttonContainer); overlay.appendChild(modal); document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeConfirmationModal(); });
    };

// --- Обработка блоков кода (Без изменений) ---
const processCodeBlocks = (containerElement) => {
    if (!containerElement) { return; }
    // Находим <pre> без шапки И НЕ внутри table-wrapper
    const preElements = containerElement.querySelectorAll('pre:not(:has(.code-block-header)):not(.table-wrapper pre)');
    preElements.forEach((preElement) => {
        const codeBlock = preElement.querySelector('code');
        if (!codeBlock) { return; }

        // --- Подсветка кода ---
        try {
            if (typeof hljs !== 'undefined' && typeof hljs.highlightElement === 'function') {
                hljs.highlightElement(codeBlock); // Подсвечиваем сам codeBlock
            }
        } catch (e) { console.error("processCodeBlocks: Ошибка подсветки:", e); }

        // --- Создание шапки (Header) ---
        const header = document.createElement('div'); header.className = 'code-block-header';
        let language = 'plaintext'; const languageClass = Array.from(codeBlock.classList).find(cls => cls.startsWith('language-'));
        if (languageClass) { language = languageClass.replace('language-', ''); }
        const langSpan = document.createElement('span'); langSpan.className = 'code-block-language'; langSpan.textContent = language;
        const copyButton = document.createElement('button'); copyButton.className = 'code-block-copy-button'; copyButton.title = 'Копировать код';
        // --- Копируем текст из codeBlock ---
        const uniqueId = `code-${Math.random().toString(36).substring(2, 15)}`; // Генерируем ID
        copyButton.dataset.targetCodeElement = uniqueId; // Устанавливаем data-атрибут
        codeBlock.id = uniqueId; // Присваиваем ID самому элементу code
         // --- Конец изменения ---
        try { if (typeof feather !== 'undefined' && feather.icons['copy']) { copyButton.innerHTML = feather.icons['copy'].toSvg(); } else { copyButton.textContent = 'Copy'; } }
        catch(iconError){ copyButton.textContent = 'Copy'; }
        header.appendChild(langSpan); header.appendChild(copyButton); preElement.insertBefore(header, codeBlock); // Вставляем шапку перед codeBlock
    });
     try { if (typeof feather !== 'undefined') feather.replace({'stroke-width': 2}); } catch(e){} // Перерисовываем иконки
};

    // --- Функция для обертки таблиц ---
    const wrapTables = (container) => {
        // Если контейнер не передан, ищем во всем документе
        const searchContainer = container || document;
        
        // Ищем все таблицы
        const tables = searchContainer.querySelectorAll('table');
        console.log(`wrapTables: Найдено ${tables.length} таблиц в ${container ? 'контейнере' : 'документе'}`);
        
        // Также выведем все элементы с тегом table для отладки
        if (tables.length === 0) {
            // Попробуем найти таблицы в message-content
            const messageContents = searchContainer.querySelectorAll('.message-content');
            console.log(`wrapTables: Найдено ${messageContents.length} элементов .message-content`);
            messageContents.forEach((content, idx) => {
                const innerTables = content.querySelectorAll('table');
                if (innerTables.length > 0) {
                    console.log(`wrapTables: В message-content ${idx + 1} найдено ${innerTables.length} таблиц`);
                }
                
                // Проверяем различные варианты написания тега table
                const htmlContent = content.innerHTML.toLowerCase();
                if (htmlContent.includes('<table') || htmlContent.includes('&lt;table')) {
                    console.log(`wrapTables: message-content ${idx + 1} содержит упоминание table в HTML`);
                    // Выводим первые 500 символов для отладки
                    console.log(`wrapTables: Первые 500 символов HTML: ${content.innerHTML.substring(0, 500)}...`);
                }
                
                // Проверяем, есть ли элементы с классом table-wrapper
                const existingWrappers = content.querySelectorAll('.table-wrapper');
                if (existingWrappers.length > 0) {
                    console.log(`wrapTables: В message-content ${idx + 1} уже есть ${existingWrappers.length} оберток .table-wrapper`);
                    // Проверяем, есть ли таблицы внутри оберток
                    existingWrappers.forEach((wrapper, wIdx) => {
                        const wrappedTables = wrapper.querySelectorAll('table');
                        console.log(`wrapTables: В обертке ${wIdx + 1} найдено ${wrappedTables.length} таблиц`);
                    });
                }
                
                // Ищем все элементы, которые могут выглядеть как таблицы
                const preElements = content.querySelectorAll('pre');
                if (preElements.length > 0) {
                    console.log(`wrapTables: В message-content ${idx + 1} найдено ${preElements.length} элементов <pre> (возможно, таблица отображается как код)`);
                }
            });
        }
        
        tables.forEach((table, index) => {
            // Проверяем, не обернута ли таблица уже
            const currentParent = table.parentNode;
            console.log(`Table ${index + 1}: родитель = ${currentParent.tagName}, классы = ${currentParent.className}`);
            
            if (!currentParent.classList.contains('table-wrapper')) {
                console.log(`Table ${index + 1}: оборачиваем таблицу...`);
                const wrapper = document.createElement('div');
                wrapper.className = 'table-wrapper';
                wrapper.setAttribute('tabindex', '0');
                currentParent.insertBefore(wrapper, table);
                wrapper.appendChild(table);
                
                // Проверяем ширину и добавляем индикатор скролла
                setTimeout(() => {
                    const isScrollable = wrapper.scrollWidth > wrapper.clientWidth;
                    if (isScrollable) {
                        wrapper.setAttribute('data-scrollable', 'true');
                    }
                    console.log(`Table ${index + 1}: обернута, ширина контейнера: ${wrapper.clientWidth}px, ширина таблицы: ${wrapper.scrollWidth}px, прокручиваемая: ${isScrollable}`);
                }, 100);
            } else {
                console.log(`Table ${index + 1}: уже обернута в .table-wrapper`);
                // Проверяем скроллабельность существующей обертки
                setTimeout(() => {
                    const isScrollable = currentParent.scrollWidth > currentParent.clientWidth;
                    if (isScrollable && !currentParent.hasAttribute('data-scrollable')) {
                        currentParent.setAttribute('data-scrollable', 'true');
                        console.log(`Table ${index + 1}: обновлен атрибут data-scrollable`);
                    }
                }, 100);
            }
        });
        
        // Если таблиц не найдено, проверим через небольшую задержку
        if (tables.length === 0) {
            setTimeout(() => {
                const delayedTables = searchContainer.querySelectorAll('table');
                if (delayedTables.length > 0) {
                    console.log(`wrapTables: Найдено ${delayedTables.length} таблиц после задержки, вызываем повторно`);
                    wrapTables(container);
                } else {
                    // Последняя попытка - искать во всем документе
                    if (container) {
                        console.log(`wrapTables: Пробуем искать во всем документе`);
                        wrapTables();
                    }
                }
            }, 500);
        }
    };

    // --- MutationObserver для автоматической обертки таблиц ---
    const setupTableObserver = () => {
        if (!chatMessagesContainer) return;
        
        const observer = new MutationObserver((mutations) => {
            let foundTables = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            // Проверяем, если это таблица
                            if (node.tagName === 'TABLE') {
                                foundTables = true;
                            }
                            // Или если внутри есть таблицы
                            else if (node.querySelector && node.querySelector('table')) {
                                foundTables = true;
                            }
                            // Или это контейнер сообщения
                            else if (node.classList && node.classList.contains('message-container')) {
                                foundTables = true;
                            }
                        }
                    });
                }
            });
            
            // Если найдены таблицы или изменения, вызываем wrapTables для всего документа
            if (foundTables || mutations.length > 0) {
                console.log('MutationObserver: Обнаружены изменения DOM, проверяем таблицы');
                setTimeout(() => {
                    if (typeof wrapTables === 'function') {
                        wrapTables(); // Ищем во всем документе
                    }
                }, 200);
            }
        });
        
        observer.observe(chatMessagesContainer, {
            childList: true,
            subtree: true,
            characterData: true // Также отслеживаем изменения текста
        });
        
        console.log("Table MutationObserver установлен");
    };

    // --- Инициализация приложения ---
    console.log("Начало инициализации приложения...");
    
    // Обернем инициализацию в try-catch для отлова критических ошибок
    try {
        // Устанавливаем наблюдатель за таблицами сразу
        setupTableObserver();
        
        loadSystemInstructions();
        loadStreamingSettings();
        console.log("Настройки загружены");
        
        // Загружаем модели и историю параллельно, но с обработкой ошибок
        Promise.all([
            loadAndPopulateModels().catch(err => {
                console.error("Ошибка при загрузке моделей (не критично):", err);
            }),
            loadChatHistory().catch(err => {
                console.error("Ошибка при загрузке истории (не критично):", err);
            })
        ]).finally(() => {
            // Эти функции выполняются в любом случае
            startNewChat(); // Начинаем с пустого/временного чата
            updateSendButtonState();
            adjustInputHeight();
            console.log("Инициализация приложения завершена");
            
            // Показываем UI даже если были ошибки загрузки
            const loadingOverlay = document.querySelector('.loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
        });
        
    } catch (criticalError) {
        console.error("КРИТИЧЕСКАЯ ОШИБКА при инициализации:", criticalError);
        alert("Произошла критическая ошибка при загрузке приложения. Пожалуйста, обновите страницу.");
    }

}); // Конец DOMContentLoaded