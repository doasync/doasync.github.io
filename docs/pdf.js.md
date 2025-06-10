TITLE: Rendering PDF Page to Canvas with PDF.js
DESCRIPTION: This JavaScript snippet demonstrates the process of loading a PDF document using the PDF.js library, retrieving its first page, and rendering it onto an HTML canvas element. It includes configurations for worker source, viewport scaling, and HiDPI screen support, preparing the canvas dimensions and context for rendering the PDF content.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/examples/learning/helloworld.html#_snippet_0

LANGUAGE: JavaScript
CODE:
```
// // If absolute URL from the remote server is provided, configure the CORS // header on that server. 
// const url = './helloworld.pdf'; 
// // The workerSrc property shall be specified. 
pdfjsLib.GlobalWorkerOptions.workerSrc = '../../node_modules/pdfjs-dist/build/pdf.worker.mjs'; 
// // Asynchronous download PDF 
const loadingTask = pdfjsLib.getDocument(url); const pdf = await loadingTask.promise; 
// // Fetch the first page 
const page = await pdf.getPage(1); const scale = 1.5; const viewport = page.getViewport({ scale }); 
// Support HiDPI-screens. const outputScale = window.devicePixelRatio || 1; 
// // Prepare canvas using PDF page dimensions 
const canvas = document.getElementById("the-canvas"); const context = canvas.getContext("2d"); canvas.width = Math.floor(viewport.width * outputScale); canvas.height = Math.floor(viewport.height * outputScale); canvas.style.width = Math.floor(viewport.width) + "px"; canvas.style.height = Math.floor(viewport.height) + "px"; const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null; 
// // Render PDF page into canvas context 
const renderContext = { canvasContext: context, transform, viewport, }; page.render(renderContext);
```

----------------------------------------

TITLE: Rendering Base64 Encoded PDF with PDF.js in JavaScript
DESCRIPTION: This snippet demonstrates the full process of loading and rendering a PDF from a base64 encoded string using the PDF.js library. It first decodes the base64 string into binary data using `atob()`, then initializes the PDF.js worker, loads the PDF document, fetches the first page, calculates viewport dimensions, and finally renders the page onto an HTML canvas element, including support for HiDPI screens.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/examples/learning/helloworld64.html#_snippet_0

LANGUAGE: JavaScript
CODE:
```
// atob() is used to convert base64 encoded PDF to binary-like data. // (See also https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/ // Base64_encoding_and_decoding.) var pdfData = atob( 'JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwog' + 'IC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXMKICAv' + 'TWVkaWFCb3ggWyAwIDAgMjAwIDIwMCBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0K' + 'Pj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAg' + 'L1Jlc291cmNlcyA8PAogICAgL0ZvbnQgPDwKICAgICAgL0YxIDQgMCBSIAogICAgPj4KICA+' + 'PgogIC9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKCjQgMCBvYmoKPDwKICAvVHlwZSAvRm9u' + 'dAogIC9TdWJ0eXBlIC9UeXBlMQogIC9CYXNlRm9udCAvVGltZXMtUm9tYW4KPj4KZW5kb2Jq' + 'Cgo1IDAgb2JqICAlIHBhZ2UgY29udGVudAo8PAogIC9MZW5ndGggNDQKPj4Kc3RyZWFtCkJU' + 'CjcwIDUwIFRECi9GMSAxMiBUZgooSGVsbG8sIHdvcmxkISkgVGoKRVQKZW5kc3RyZWFtCmVu' + 'ZG9iagoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4g' + 'CjAwMDAwMDAwNzkgMDAwMDAgbiAKMDAwMDAwMDE3MyAwMDAwMCBuIAowMDAwMDAwMzAxIDAw' + 'MDAwIG4gCjAwMDAwMDAzODAgMDAwMDAgbiAKdHJhaWxlcgo8PAogIC9TaXplIDYKICAvUm9v' + 'dCAxIDAgUgo+PgpzdGFydHhyZWYKNDkyCiUlRU9'); //
// The workerSrc property shall be specified. //
pdfjsLib.GlobalWorkerOptions.workerSrc = '../../node_modules/pdfjs-dist/build/pdf.worker.mjs'; // Opening PDF by passing its binary data as a string. It is still preferable // to use Uint8Array, but string or array-like structure will work too. var loadingTask = pdfjsLib.getDocument({ data: pdfData, }); var pdf = await loadingTask.promise; // Fetch the first page. var page = await pdf.getPage(1); var scale = 1.5; var viewport = page.getViewport({ scale: scale, }); // Support HiDPI-screens. var outputScale = window.devicePixelRatio || 1; // Prepare canvas using PDF page dimensions. var canvas = document.getElementById('the-canvas'); var context = canvas.getContext('2d'); canvas.width = Math.floor(viewport.width * outputScale); canvas.height = Math.floor(viewport.height * outputScale); canvas.style.width = Math.floor(viewport.width) + "px"; canvas.style.height = Math.floor(viewport.height) + "px"; var transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null; // Render PDF page into canvas context. var renderContext = { canvasContext: context, transform, viewport, }; page.render(renderContext);
```

----------------------------------------

TITLE: Loading a PDF Document with Promise Handling - PDF.js - JavaScript
DESCRIPTION: This snippet shows how to load a PDF document and handle the asynchronous result using Promises. The `getDocument` method returns a loading task, and its `promise` property resolves with the `PDFDocumentProxy` object once the document is loaded.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/docs/contents/examples/index.md#_snippet_1

LANGUAGE: JavaScript
CODE:
```
var loadingTask = pdfjsLib.getDocument('helloworld.pdf');
loadingTask.promise.then(function(pdf) {
  // you can now use *pdf* here
});
```

----------------------------------------

TITLE: Rendering a PDF Page to Canvas - PDF.js - JavaScript
DESCRIPTION: This snippet illustrates how to render a PDF page onto an HTML canvas element. It calculates the viewport, adjusts for HiDPI screens, sets canvas dimensions, and prepares a render context before calling `page.render()` to draw the page content.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/docs/contents/examples/index.md#_snippet_3

LANGUAGE: JavaScript
CODE:
```
var scale = 1.5;
var viewport = page.getViewport({ scale: scale, });
// Support HiDPI-screens.
var outputScale = window.devicePixelRatio || 1;

var canvas = document.getElementById('the-canvas');
var context = canvas.getContext('2d');

canvas.width = Math.floor(viewport.width * outputScale);
canvas.height = Math.floor(viewport.height * outputScale);
canvas.style.width = Math.floor(viewport.width) + "px";
canvas.style.height =  Math.floor(viewport.height) + "px";

var transform = outputScale !== 1
  ? [outputScale, 0, 0, outputScale, 0, 0]
  : null;

var renderContext = {
  canvasContext: context,
  transform: transform,
  viewport: viewport
};
page.render(renderContext);
```

----------------------------------------

TITLE: Rendering PDF Page to Canvas (JavaScript)
DESCRIPTION: The `renderPage` function is responsible for fetching a specified PDF page, calculating its viewport with scaling for HiDPI screens, adjusting the canvas dimensions, and rendering the page content onto the canvas. It uses promises to manage asynchronous page fetching and rendering, updating the UI with the current page number and handling any pending rendering requests.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/examples/learning/prevnext.html#_snippet_1

LANGUAGE: JavaScript
CODE:
```
function renderPage(num) {
  pageRendering = true;
  pdfDoc.getPage(num).then(function(page) {
    var viewport = page.getViewport({
      scale: scale
    });
    var outputScale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = Math.floor(viewport.width) + "px";
    canvas.style.height = Math.floor(viewport.height) + "px";
    var transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;
    var renderContext = {
      canvasContext: ctx,
      transform: transform,
      viewport: viewport
    };
    var renderTask = page.render(renderContext);
    renderTask.promise.then(function () {
      pageRendering = false;
      if (pageNumPending !== null) {
        renderPage(pageNumPending);
        pageNumPending = null;
      }
    });
  });
  document.getElementById('page_num').textContent = num;
}
```

----------------------------------------

TITLE: Loading a PDF Document (Basic) - PDF.js - JavaScript
DESCRIPTION: This snippet demonstrates the basic way to initiate loading of a PDF document using PDF.js. It returns a `PDFDocumentLoadingTask` instance, which contains a promise that resolves with the PDF document object.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/docs/contents/examples/index.md#_snippet_0

LANGUAGE: JavaScript
CODE:
```
pdfjsLib.getDocument('helloworld.pdf')
```

----------------------------------------

TITLE: Importing PDF.js Webpack Module
DESCRIPTION: This JavaScript import statement demonstrates the recommended zero-configuration method for loading PDF.js within a Webpack project. It imports the 'pdfjs-dist/webpack.mjs' module, which simplifies worker loading and removes the need for 'worker-loader'.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/examples/webpack/README.md#_snippet_1

LANGUAGE: JavaScript
CODE:
```
import * as pdfjsLib from 'pdfjs-dist/webpack.mjs';
```

----------------------------------------

TITLE: Configuring PDF.js Worker and Initializing Variables (JavaScript)
DESCRIPTION: This snippet sets the path for the PDF.js worker script, which is crucial for offloading PDF processing. It also initializes key variables such as the PDF document object, current page number, rendering state flags, display scale, and references to the HTML canvas element and its 2D rendering context.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/examples/learning/prevnext.html#_snippet_0

LANGUAGE: JavaScript
CODE:
```
var url = '../../web/compressed.tracemonkey-pldi-09.pdf';
pdfjsLib.GlobalWorkerOptions.workerSrc = '../../node_modules/pdfjs-dist/build/pdf.worker.mjs';
var pdfDoc = null, pageNum = 1, pageRendering = false, pageNumPending = null, scale = 0.8, canvas = document.getElementById('the-canvas'), ctx = canvas.getContext('2d');
```

----------------------------------------

TITLE: Fetching a Specific Page from PDF Document - PDF.js - JavaScript
DESCRIPTION: This snippet demonstrates how to retrieve a specific page from a loaded PDF document. The `getPage` method returns a promise that resolves with the `PDFPageProxy` object for the requested page number.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/docs/contents/examples/index.md#_snippet_2

LANGUAGE: JavaScript
CODE:
```
pdf.getPage(1).then(function(page) {
  // you can now use *page* here
});
```

----------------------------------------

TITLE: Loading PDF Document and Initial Render (JavaScript)
DESCRIPTION: This final snippet initiates the asynchronous download of the PDF document using `pdfjsLib.getDocument`. Once the document is loaded, it updates the 'page_count' display with the total number of pages and then triggers the initial rendering of the first page, making the PDF visible to the user.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/examples/learning/prevnext.html#_snippet_5

LANGUAGE: JavaScript
CODE:
```
var loadingTask = pdfjsLib.getDocument(url);
pdfDoc = await loadingTask.promise;
document.getElementById('page_count').textContent = pdfDoc.numPages;
renderPage(pageNum);
```

----------------------------------------

TITLE: Scaling PDF Page to Desired Width - PDF.js - JavaScript
DESCRIPTION: This snippet shows how to calculate the appropriate scale factor to render a PDF page to a specific desired width. It first gets the original viewport, then calculates the scale based on the desired width, and finally creates a new scaled viewport.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/docs/contents/examples/index.md#_snippet_4

LANGUAGE: JavaScript
CODE:
```
var desiredWidth = 100;
var viewport = page.getViewport({ scale: 1, });
var scale = desiredWidth / viewport.width;
var scaledViewport = page.getViewport({ scale: scale, });
```

----------------------------------------

TITLE: Queueing PDF Page Rendering (JavaScript)
DESCRIPTION: The `queueRenderPage` function manages the rendering process to prevent multiple pages from attempting to render simultaneously. If a page is currently being rendered, it stores the new page number in `pageNumPending` to be rendered after the current task completes; otherwise, it immediately calls `renderPage` to begin rendering.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/examples/learning/prevnext.html#_snippet_2

LANGUAGE: JavaScript
CODE:
```
function queueRenderPage(num) {
  if (pageRendering) {
    pageNumPending = num;
  } else {
    renderPage(num);
  }
}
```

----------------------------------------

TITLE: Navigating to Previous PDF Page (JavaScript)
DESCRIPTION: This snippet defines the `onPrevPage` function, which handles navigation to the previous page. It decrements the `pageNum` variable and calls `queueRenderPage` to initiate rendering, ensuring the page number does not go below 1. An event listener is attached to the 'prev' button to trigger this function on click.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/examples/learning/prevnext.html#_snippet_3

LANGUAGE: JavaScript
CODE:
```
function onPrevPage() {
  if (pageNum <= 1) {
    return;
  }
  pageNum--;
  queueRenderPage(pageNum);
}
document.getElementById('prev').addEventListener('click', onPrevPage);
```

----------------------------------------

TITLE: Navigating to Next PDF Page (JavaScript)
DESCRIPTION: This snippet defines the `onNextPage` function, which handles navigation to the next page. It increments the `pageNum` variable and calls `queueRenderPage` to initiate rendering, preventing navigation beyond the total number of pages in the document. An event listener is attached to the 'next' button to trigger this function on click.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/examples/learning/prevnext.html#_snippet_4

LANGUAGE: JavaScript
CODE:
```
function onNextPage() {
  if (pageNum >= pdfDoc.numPages) {
    return;
  }
  pageNum++;
  queueRenderPage(pageNum);
}
document.getElementById('next').addEventListener('click', onNextPage);
```

----------------------------------------

TITLE: Styling Body Element for PDF.js Viewer - CSS
DESCRIPTION: This CSS snippet defines the basic styling for the `body` element of the PDF.js viewer. It sets a dark grey background color, removes default margins, and padding to ensure the viewer occupies the full viewport without extra spacing.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/examples/components/simpleviewer.html#_snippet_0

LANGUAGE: CSS
CODE:
```
body { background-color: #808080; margin: 0; padding: 0; }
```

----------------------------------------

TITLE: Building PDF.js Webpack Example
DESCRIPTION: These shell commands guide the user through installing necessary dependencies and building the PDF.js Webpack example. It involves using gulp for initial setup, navigating to the example directory, installing Node.js packages, and finally running Webpack to bundle the application.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/examples/webpack/README.md#_snippet_0

LANGUAGE: Shell
CODE:
```
$ gulp dist-install
$ cd examples/webpack
$ npm install
$ ./node_modules/webpack/bin/webpack.js
```

----------------------------------------

TITLE: Configuring PDF.js Module Imports (JSON)
DESCRIPTION: This JSON snippet defines the import map for the PDF.js viewer, mapping module aliases to their file paths. It includes paths for core PDF.js components, web-specific utilities, and third-party dependencies like Fluent and Cached Iterable. This configuration is crucial for resolving module imports within the application.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/web/viewer.html#_snippet_0

LANGUAGE: JSON
CODE:
```
{ "imports": { "pdfjs/": "../src/", "pdfjs-lib": "../src/pdf.js", "pdfjs-web/": "./", "fluent-bundle": "../node_modules/@fluent/bundle/esm/index.js", "fluent-dom": "../node_modules/@fluent/dom/esm/index.js", "cached-iterable": "../node_modules/cached-iterable/src/index.mjs", "display-cmap_reader_factory": "../src/display/cmap_reader_factory.js", "display-standard_fontdata_factory": "../src/display/standard_fontdata_factory.js", "display-wasm_factory": "../src/display/wasm_factory.js", "display-fetch_stream": "../src/display/fetch_stream.js", "display-network": "../src/display/network.js", "display-node_stream": "../src/display/stubs.js", "display-node_utils": "../src/display/stubs.js", "web-alt_text_manager": "./alt_text_manager.js", "web-annotation_editor_params": "./annotation_editor_params.js", "web-download_manager": "./download_manager.js", "web-external_services": "./genericcom.js", "web-new_alt_text_manager": "./new_alt_text_manager.js", "web-null_l10n": "./genericl10n.js", "web-pdf_attachment_viewer": "./pdf_attachment_viewer.js", "web-pdf_cursor_tools": "./pdf_cursor_tools.js", "web-pdf_document_properties": "./pdf_document_properties.js", "web-pdf_find_bar": "./pdf_find_bar.js", "web-pdf_layer_viewer": "./pdf_layer_viewer.js", "web-pdf_outline_viewer": "./pdf_outline_viewer.js", "web-pdf_presentation_mode": "./pdf_presentation_mode.js", "web-pdf_sidebar": "./pdf_sidebar.js", "web-pdf_thumbnail_viewer": "./pdf_thumbnail_viewer.js", "web-preferences": "./genericcom.js", "web-print_service": "./pdf_print_service.js", "web-secondary_toolbar": "./secondary_toolbar.js", "web-signature_manager": "./signature_manager.js", "web-toolbar": "./toolbar.js" }
```

----------------------------------------

TITLE: Cloning PDF.js Repository (Shell)
DESCRIPTION: This snippet demonstrates how to obtain the PDF.js source code by cloning its GitHub repository using the `git clone` command, followed by navigating into the newly created project directory using `cd`.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/docs/contents/getting_started/index.md#_snippet_0

LANGUAGE: Shell
CODE:
```
$ git clone https://github.com/mozilla/pdf.js.git
$ cd pdf.js
```

----------------------------------------

TITLE: Starting a Local Development Server for PDF.js (Node.js)
DESCRIPTION: This command initiates a local web server using `npx` and `gulp`. It is crucial for development with the PDF.js source build because the viewer's worker functionality is disabled for `file://` URLs, necessitating a server environment for proper operation.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/docs/contents/getting_started/index.md#_snippet_3

LANGUAGE: Shell
CODE:
```
npx gulp server
```

----------------------------------------

TITLE: Starting the PDF.js Local Server
DESCRIPTION: Starts a local web server using npx and gulp to serve the PDF.js viewer, which is necessary for testing due to browser security restrictions on file:// URLs.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/README.md#_snippet_2

LANGUAGE: shell
CODE:
```
npx gulp server
```

----------------------------------------

TITLE: Building Generic PDF.js for Modern Browsers
DESCRIPTION: Bundles the PDF.js source files into production-ready scripts (pdf.js and pdf.worker.js) optimized for modern web browsers.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/README.md#_snippet_4

LANGUAGE: shell
CODE:
```
npx gulp generic
```

----------------------------------------

TITLE: Installing PDF.js Project Dependencies (Shell)
DESCRIPTION: Installs all required Node.js packages for the PDF.js project, as defined in the `package.json` file, preparing the environment for building and running examples.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/examples/node/pdf2png/README.md#_snippet_0

LANGUAGE: Shell
CODE:
```
npm install
```

----------------------------------------

TITLE: Installing PDF.js Dependencies
DESCRIPTION: Installs all required Node.js packages and dependencies listed in the project's package.json file using npm.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/README.md#_snippet_1

LANGUAGE: shell
CODE:
```
npm install
```

----------------------------------------

TITLE: Executing PDF2PNG Conversion Script (Shell)
DESCRIPTION: Runs the `pdf2png.mjs` Node.js script from the command line, initiating the process to convert a PDF file to a PNG image using the PDF.js library.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/examples/node/pdf2png/README.md#_snippet_3

LANGUAGE: Shell
CODE:
```
node pdf2png.mjs
```

----------------------------------------

TITLE: Starting PDF.js Web Server - Shell
DESCRIPTION: This command starts a local web server, making the PDF.js mobile viewer accessible in a browser at http://localhost:8888/examples/mobile-viewer/viewer.html.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/examples/mobile-viewer/README.md#_snippet_1

LANGUAGE: Shell
CODE:
```
gulp server
```

----------------------------------------

TITLE: Cloning the PDF.js Repository
DESCRIPTION: Clones the PDF.js repository from GitHub to your local machine and changes the current directory to the newly created 'pdf.js' folder.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/README.md#_snippet_0

LANGUAGE: shell
CODE:
```
git clone https://github.com/mozilla/pdf.js.git
cd pdf.js
```

----------------------------------------

TITLE: Overview of Prebuilt PDF.js File Layout (Plaintext)
DESCRIPTION: This snippet illustrates the directory structure of the prebuilt PDF.js distribution, highlighting key components such as the `build` folder containing the display and core layers, and the `web` folder which houses viewer-related assets like CSS, HTML, and JavaScript.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/docs/contents/getting_started/index.md#_snippet_1

LANGUAGE: Plaintext
CODE:
```
├── build/
│   ├── pdf.mjs                            - display layer
│   ├── pdf.mjs.map                        - display layer's source map
│   ├── pdf.worker.mjs                     - core layer
│   └── pdf.worker.mjs.map                 - core layer's source map
├── web/
│   ├── cmaps/                             - character maps (required by core)
│   ├── compressed.tracemonkey-pldi-09.pdf - PDF file for testing purposes
│   ├── images/                            - images for the viewer and annotation icons
│   ├── locale/                            - translation files
│   ├── viewer.css                         - viewer style sheet
│   ├── viewer.html                        - viewer layout
│   ├── viewer.mjs                         - viewer layer
│   └── viewer.mjs.map                     - viewer layer's source map
└── LICENSE
```

----------------------------------------

TITLE: Overview of PDF.js Source Code File Layout (Plaintext)
DESCRIPTION: This snippet details the comprehensive directory structure of the PDF.js source repository, showcasing folders for documentation, examples, browser extensions, external dependencies, localization, the core `src` components, testing, and the viewer layer, along with project configuration files.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/docs/contents/getting_started/index.md#_snippet_2

LANGUAGE: Plaintext
CODE:
```
├── docs/                                  - website source code
├── examples/                              - simple usage examples
├── extensions/                            - browser extension source code
├── external/                              - third party code
├── l10n/                                  - translation files
├── src/
│   ├── core/                              - core layer
│   ├── display/                           - display layer
│   ├── shared/                            - shared code between the core and display layers
│   ├── interfaces.js                      - interface definitions for the core/display layers
│   └── pdf.*.js                           - wrapper files for bundling
├── test/                                  - unit, font, reference, and integration tests
├── web/                                   - viewer layer
├── LICENSE
├── README.md
├── gulpfile.mjs                           - build scripts/logic
├── package-lock.json                      - pinned dependency versions
└── package.json                           - package definition and dependencies
```

----------------------------------------

TITLE: Defining Module Import Maps for PDF.js (JSON)
DESCRIPTION: This JSON object defines import maps, which are used by modern JavaScript module loaders to resolve module specifiers to their corresponding URLs. It maps various internal PDF.js modules and external dependencies (like `fluent-bundle`, `cached-iterable`) to their relative paths, facilitating module resolution in the browser or specific environments like GeckoView. This configuration is crucial for the correct loading of PDF.js components.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/web/viewer-geckoview.html#_snippet_1

LANGUAGE: JSON
CODE:
```
{ "imports": { "pdfjs/": "../src/", "pdfjs-lib": "../src/pdf.js", "pdfjs-web/": "./", "fluent-bundle": "../node_modules/@fluent/bundle/esm/index.js", "fluent-dom": "../node_modules/@fluent/dom/esm/index.js", "cached-iterable": "../node_modules/cached-iterable/src/index.mjs", "display-cmap_reader_factory": "../src/display/cmap_reader_factory.js", "display-standard_fontdata_factory": "../src/display/standard_fontdata_factory.js", "display-wasm_factory": "../src/display/wasm_factory.js", "display-fetch_stream": "../src/display/fetch_stream.js", "display-network": "../src/display/network.js", "display-node_stream": "../src/display/stubs.js", "display-node_utils": "../src/display/stubs.js", "web-alt_text_manager": "./stubs-geckoview.js", "web-annotation_editor_params": "./stubs-geckoview.js", "web-download_manager": "./download_manager.js", "web-external_services": "./genericcom.js", "web-new_alt_text_manager": "./stubs-geckoview.js", "web-null_l10n": "./genericl10n.js", "web-pdf_attachment_viewer": "./stubs-geckoview.js", "web-pdf_cursor_tools": "./stubs-geckoview.js", "web-pdf_document_properties": "./stubs-geckoview.js", "web-pdf_find_bar": "./stubs-geckoview.js", "web-pdf_layer_viewer": "./stubs-geckoview.js", "web-pdf_outline_viewer": "./stubs-geckoview.js", "web-pdf_presentation_mode": "./stubs-geckoview.js", "web-pdf_sidebar": "./stubs-geckoview.js", "web-pdf_thumbnail_viewer": "./stubs-geckoview.js", "web-preferences": "./genericcom.js", "web-print_service": "./pdf_print_service.js", "web-secondary_toolbar": "./stubs-geckoview.js", "web-signature_manager": "./stubs-geckoview.js", "web-toolbar": "./toolbar-geckoview.js" } }
```

----------------------------------------

TITLE: Building Generic PDF.js for Older Browsers
DESCRIPTION: Bundles the PDF.js source files into production-ready scripts (pdf.js and pdf.worker.js) with additional compatibility for older web browsers.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/README.md#_snippet_5

LANGUAGE: shell
CODE:
```
npx gulp generic-legacy
```

----------------------------------------

TITLE: Building PDF.js Distribution Files (Shell)
DESCRIPTION: Executes the Gulp build task to compile and prepare the PDF.js library's distribution files, which are necessary for running examples and applications.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/examples/node/pdf2png/README.md#_snippet_1

LANGUAGE: Shell
CODE:
```
gulp dist-install
```

----------------------------------------

TITLE: Building PDF.js Library - Shell
DESCRIPTION: This command builds the PDF.js library, preparing it for installation and use. It's a prerequisite for running the mobile viewer example locally.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/examples/mobile-viewer/README.md#_snippet_0

LANGUAGE: Shell
CODE:
```
gulp dist-install
```

----------------------------------------

TITLE: Installing pdfjs-dist Package Locally
DESCRIPTION: Builds and installs the 'pdfjs-dist' package locally within the repository, useful for testing examples that depend on the distributed version.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/README.md#_snippet_6

LANGUAGE: shell
CODE:
```
npx gulp dist-install
```

----------------------------------------

TITLE: Configuring Viewer Container Styles in CSS
DESCRIPTION: This CSS snippet styles the #viewerContainer element, making it an absolutely positioned, scrollable block that fills the entire width and height of its parent, suitable for embedding a PDF viewer.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/examples/components/singlepageviewer.html#_snippet_1

LANGUAGE: CSS
CODE:
```
#viewerContainer { overflow: auto; position: absolute; width: 100%; height: 100%; }
```

----------------------------------------

TITLE: Styling Viewer Container for PDF.js - CSS
DESCRIPTION: This CSS snippet styles the `#viewerContainer` element, which likely holds the PDF content. It enables auto-scrolling if content overflows, positions the container absolutely to fill its parent, and sets its width and height to 100% to occupy the entire available space.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/examples/components/simpleviewer.html#_snippet_1

LANGUAGE: CSS
CODE:
```
#viewerContainer { overflow: auto; position: absolute; width: 100%; height: 100%; }
```

----------------------------------------

TITLE: Defining PDF.js Module Import Paths (JSON)
DESCRIPTION: This JSON snippet represents an import map, crucial for resolving module dependencies within the PDF.js project. It maps logical module names (e.g., 'pdfjs/', 'pdfjs-lib') to their physical file paths, enabling consistent module loading across different environments. This configuration is specifically used for the font testing setup.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/test/font/font_test.html#_snippet_0

LANGUAGE: JSON
CODE:
```
{ "imports": { "pdfjs/": "../../src/", "pdfjs-lib": "../../src/pdf.js", "pdfjs-web/": "../../web/", "pdfjs-test/": "../" } }
```

----------------------------------------

TITLE: Building the PDF.js Chrome Extension
DESCRIPTION: Executes the gulp task to build the unpackaged PDF.js extension specifically for the Chrome browser.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/README.md#_snippet_3

LANGUAGE: shell
CODE:
```
npx gulp chromium
```

----------------------------------------

TITLE: Navigating to PDF2PNG Example Directory (Shell)
DESCRIPTION: Changes the current working directory to the specific `pdf2png` example folder, which contains the script for converting PDF files to PNG images.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/examples/node/pdf2png/README.md#_snippet_2

LANGUAGE: Shell
CODE:
```
cd examples/node/pdf2png
```

----------------------------------------

TITLE: Running PDF.js Font Tests Locally with Virtual Environment
DESCRIPTION: This snippet provides the commands to set up a Python virtual environment, install `fonttools` within it, activate the environment, and then execute the PDF.js font tests using `npx gulp fonttest`. This method ensures dependency isolation and avoids system-wide installations.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/test/font/README.md#_snippet_0

LANGUAGE: Shell
CODE:
```
python3 -m venv venv
source venv/bin/activate
pip install fonttools
npx gulp fonttest
```

----------------------------------------

TITLE: Initializing GeckoView Flag in PDF.js (JavaScript)
DESCRIPTION: This snippet checks if the global `PDFJSDev` variable is undefined, which typically indicates a non-development environment. If it is, it sets `window.isGECKOVIEW` to `true`, signaling that the PDF.js viewer is running within a GeckoView environment. This is a common pattern for environment-specific configurations.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/web/viewer-geckoview.html#_snippet_0

LANGUAGE: JavaScript
CODE:
```
if (typeof PDFJSDev === "undefined") { window.isGECKOVIEW = true; }
```

----------------------------------------

TITLE: Styling Checkbox Input Shrink Behavior in PDF.js Viewer Options - CSS
DESCRIPTION: This CSS rule prevents the checkbox input element itself from shrinking within its flex container, ensuring it maintains its original size regardless of available space.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/extensions/chromium/options/options.html#_snippet_3

LANGUAGE: CSS
CODE:
```
.checkbox label input { flex-shrink: 0; }
```

----------------------------------------

TITLE: Styling Checkbox Label Display in PDF.js Viewer Options - CSS
DESCRIPTION: This CSS rule configures the display of labels within checkbox elements. It uses `inline-flex` to allow the label and its content (like the input itself) to be aligned horizontally and vertically centered.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/extensions/chromium/options/options.html#_snippet_2

LANGUAGE: CSS
CODE:
```
.checkbox label { display: inline-flex; align-items: center; }
```

----------------------------------------

TITLE: Initializing PDF.js Test Driver in JavaScript
DESCRIPTION: This JavaScript snippet imports the `Driver` class from `driver.js` and instantiates it. The constructor receives an object mapping specific functionalities (like `disableScrolling`, `inflight`, `output`, `end`) to their corresponding DOM elements, retrieved by `document.getElementById()`. Finally, the `run()` method is called on the driver instance to start the test execution process.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/test/test_slave.html#_snippet_0

LANGUAGE: JavaScript
CODE:
```
import { Driver } from "./driver.js"; const driver = new Driver({ disableScrolling: document.getElementById('disableScrolling'), inflight: document.getElementById('inflight'), output: document.getElementById('output'), end: document.getElementById('end') }); driver.run();
```

----------------------------------------

TITLE: Styling Settings Row Margin in PDF.js Viewer Options - CSS
DESCRIPTION: This CSS rule applies a vertical margin to elements with the class `settings-row`, providing consistent spacing between different settings sections on the page.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/extensions/chromium/options/options.html#_snippet_1

LANGUAGE: CSS
CODE:
```
.settings-row { margin: 1em 0; }
```

----------------------------------------

TITLE: Building Docker Image for OpenJPEG (Node.js/Shell)
DESCRIPTION: This Node.js command executes the `build.js` script with the `-C` flag, which is used to build the necessary Docker image for the OpenJPEG compilation process. A Docker setup is a prerequisite for this step.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/external/openjpeg/README.md#_snippet_1

LANGUAGE: Shell
CODE:
```
node build.js -C
```

----------------------------------------

TITLE: Styling Body Element in PDF.js Viewer Options - CSS
DESCRIPTION: This CSS rule sets the minimum width and margins for the `body` element of the PDF.js viewer's settings page. It ensures the page is at least 400px wide and applies consistent outer spacing.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/extensions/chromium/options/options.html#_snippet_0

LANGUAGE: CSS
CODE:
```
body { min-width: 400px; /* a page at the settings page is at least 400px wide */ margin: 14px 17px; /* already added by default in Chrome 40.0.2212.0 */ }
```

----------------------------------------

TITLE: Compiling QuickJS Sandbox - Shell
DESCRIPTION: This command uses the `build.js` script to compile the QuickJS sandbox, placing the output in the specified `/pdf.js/external/quickjs/` directory. This step generates the `quickjs-eval.js` file.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/external/quickjs/README.md#_snippet_2

LANGUAGE: Shell
CODE:
```
node build.js -co /pdf.js/external/quickjs/
```

----------------------------------------

TITLE: Building Docker Image for QuickJS - Shell
DESCRIPTION: This command executes the `build.js` script to create the necessary Docker image for the QuickJS build environment. A Docker setup is required for this step.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/external/quickjs/README.md#_snippet_1

LANGUAGE: Shell
CODE:
```
node build.js -C
```

----------------------------------------

TITLE: Compiling OpenJPEG Decoder (Node.js/Shell)
DESCRIPTION: This Node.js command runs the `build.js` script with the `-co` flag, specifying the output directory `/pdf.js/external/openjpeg/`. This action compiles the OpenJPEG decoder, generating the `openjpeg.js` file.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/external/openjpeg/README.md#_snippet_2

LANGUAGE: Shell
CODE:
```
node build.js -co /pdf.js/external/openjpeg/
```

----------------------------------------

TITLE: Compiling qcms Decoder
DESCRIPTION: This command compiles the qcms decoder, resulting in the generation of `qcms.js` and `qcms_bg.wasm` files. It requires a pre-built Docker image and specifies the output directory for the compiled assets.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/external/qcms/README.md#_snippet_1

LANGUAGE: Shell
CODE:
```
node build.js -co /pdf.js/external/qcms/
```

----------------------------------------

TITLE: Cloning pdf.js.openjpeg Repository (Shell)
DESCRIPTION: This command clones the `pdf.js.openjpeg` Git repository from GitHub. This is the first step required to obtain the source code necessary for building `openjpeg.js`.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/external/openjpeg/README.md#_snippet_0

LANGUAGE: Shell
CODE:
```
git clone https://github.com/mozilla/pdf.js.openjpeg/
```

----------------------------------------

TITLE: Cloning pdf.js.quickjs Repository - Shell
DESCRIPTION: This command clones the `pdf.js.quickjs` repository from GitHub, which is a prerequisite for building the `quickjs-eval.js` file. It fetches all necessary source files for the QuickJS integration.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/external/quickjs/README.md#_snippet_0

LANGUAGE: Shell
CODE:
```
git clone https://github.com/mozilla/pdf.js.quickjs/
```

----------------------------------------

TITLE: Styling Body Element in CSS
DESCRIPTION: This CSS snippet sets the background color of the HTML body to a dark gray (#808080) and removes default margins and padding, providing a clean base for the viewer application.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/examples/components/singlepageviewer.html#_snippet_0

LANGUAGE: CSS
CODE:
```
body { background-color: #808080; margin: 0; padding: 0; }
```

----------------------------------------

TITLE: Displaying Source Code in HTML Element
DESCRIPTION: This JavaScript snippet retrieves the text content from an HTML <script> element (identified by 'script') and assigns it to the textContent property of another HTML element (identified by 'code'). This is a common pattern for dynamically displaying source code or pre-formatted text on a webpage.
SOURCE: https://github.com/mozilla/pdf.js/blob/master/examples/learning/helloworld.html#_snippet_1

LANGUAGE: JavaScript
CODE:
```
document.getElementById('code').textContent = document.getElementById('script').text;
```