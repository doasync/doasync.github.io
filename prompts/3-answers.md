## API Key Security:

this risk is acceptable for the target audience

##  Model List Management:

it be fetched dynamically from an OpenRouter endpoint on startup

##  Chat Title Generation:

it Should default to a date and time .

Then a free `google/gemma-3-27b-it:free` model will be used for now after the first user message to generate a title using a simple hardcoded prompt.

##  Message Editing (Model Messages):

Editing allows the user to fix any message right there to meet their immediate need. This is arguably the most crucial aspect for ongoing interactions. By editing the model's response, the user effectively re-calibrates the conversation history. They are telling the model, "This is what you should have said," which directly influences the context for the next turn. When a user edits a model's response in the interface, that interface usually updates the conversational transcript. The edited version of the response replaces the original version in the history that will be sent back to the LLM for the next user prompt. Any turn after the edited response will  see the edited version as part of the history.

## Message Deletion Logic:

When a user explicitly deletes a User Message (UM), The UM is removed from the Chat History and the Visible Transcript. The immediately following Model Response (MR), if one exists, remains. When a user explicitly deletes a Model Response (MR), only that specific MR is removed from the Chat History and the Visible Transcript. The LLM should only "see" the conversation as it currently exists after user modifications. Deleted messages are treated as if they never happened for the purpose of generating future responses.

##  Retry/Resubmission Behavior:

let's keep it simple for now

##  File Handling Details:
The UI clearly indicates that a file is attached and ready to be sent with the next message.
The practical size limits for client-side reading of text/image files are ~20mb.

unsupported file types or errors during file reading will be handled as simple as possible (alerts probably)

Binary image data will be encoded as base64 and sent to the model as data URL "data:image/png;base64,", base64_image)

there will be a check if the selected model actually supports multimodal input:
When requesting a list of models there will be a json data with architecture -> input_modalities array.

##  Token Count Calculation:

No library will be used to estimate tokens.  token counts are stored for each message. App gets it in a response to chat completion requsest in "usage" => "total_tokens". We can just sum them up.

## IndexedDB Storage Limits & Performance:

no warnings for  potential IndexedDB storage limits.

##  UI/UX Specifics:

For mobile Bottom Drawers: users will switch between both History and Settings using tabs within the drawer or separate trigger icons in the header. Mobile Drawer Switching will be handled via tabs within the drawer as well as separate trigger icons in the header bar as described. Tabs are just for convenience.

Need to ensure usability of action icons on touch devices.

## State Management Complexity:
effector will be structured to manage this complex state reliably according to effector docs

##  Handling Model Changes Mid-Chat:

the change only apply going forward. the UI doesn't indicate if the model changed.

## Error Alert Display:

It should be displayed as slide-in alert responsive draggable Dialog (element). 

## Default Settings: 

the initial default value for the Temperature is 1. And the System Prompt input when the application first loads or a new chat is created is loaded from localstorage (empty by default)