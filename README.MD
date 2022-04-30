# MultiFile

MultiFile is a fork of [gildas-lormeau/SingleFileZ](https://github.com/gildas-lormeau/SingleFileZ) that allows you to save a webpage as as one main HTML file plus original resource files (images, fonts, stylesheets and frames) in different folders. The main use case of MultiFile is to programmatically save high-fidelity webpages via command line. Because currently browser automation tools such as Playwright does not provide a way to call the browser's "Save As" feature.

## Usage

MultiFile only works as a command line script. You can execute `cli/multifile` directly to see all the options, which are the same as SingleFileZ.

SingleFileZ can be installed and invoked as a browser extension, however not for MultiFile, because if the user can already install and operate browser extensions, they can just use the browser's built-in "Save As" function to replace MultiFile.

## Motivation

MultiFile was developed to be used as an extractor for [ArchiveBox](https://github.com/pellaeon/ArchiveBox/), but the MultiFile extractor had not been upstreamed yet.

## Changes from SingleFileZ

- SingleFileZ already organizes the webpage and resources into different folders, but it eventually writes them into a Zip file. MultiFile simply rewrites that portion so that the webpage HTML and resources are written directly to disk.
- Various tweaks were added so that MultiFile better captures pages that auto-navigates and lazy-load images.
- The `multifile` CLI script currently only supports calling Playwright's Firefox backend, but it should be easy to port it to other browsers.

# SingleFileZ
SingleFileZ is a fork of [SingleFile](https://github.com/gildas-lormeau/SingleFile) that allows you to save a webpage as a self-extracting HTML file. This HTML file is also a valid ZIP file which contains the resources (images, fonts, stylesheets and frames) of the saved page. This ZIP file can be unzipped on the filesystem in order, for example, to view the page in a browser that would not support pages saved with SingleFileZ.

## Demo
![](https://github.com/gildas-lormeau/SingleFile-Demos/blob/master/demo-sfz.gif)

## Examples
Here is an example of page produced by SingleFileZ: https://gildas-lormeau.github.io. Here is the same example but protected by a password (`thisisapage`): https://gildas-lormeau.github.io/private.

Other examples of files can be found here: https://github.com/gildas-lormeau/SingleFileZ/tree/master/examples

## Download
SingleFileZ is available on Firefox and Microsoft Edge. You can download the extension here:
 - Firefox: https://addons.mozilla.org/firefox/addon/singlefilez
 - Microsoft Edge: https://microsoftedge.microsoft.com/addons/detail/singlefilez/gofneaifncimeglaecpnanbnmnpfjekk

It is *not recommended* to use SingleFileZ on Chrome because it will stop working starting January 2023 (see https://github.com/gildas-lormeau/SingleFileZ/issues/105). You can however download it from here: https://chrome.google.com/webstore/detail/singlefilez/offkdfbbigofcgdokjemgjpdockaafjg.


To open saved pages from the filesystem in a Chromium-based browser, SingleFileZ must be installed and the option "Allow access to file URLs" must be enabled in the details page of the extension (e.g. chrome://extensions/?id=offkdfbbigofcgdokjemgjpdockaafjg). Otherwise, the browser must be started with the switch --allow-file-access-from-files.

To open saved pages from the filesystem in Safari, the option "Disable Local File Restrictions" must be selected in the "Develop" menu

## Notes
 - JavaScript must be enabled to view saved pages.

## Command Line Interface
You can save web pages to HTML from the command line interface. See here for more info: https://github.com/gildas-lormeau/SingleFileZ/blob/master/cli/README.MD.

## FAQ
cf. https://github.com/gildas-lormeau/SingleFileZ/blob/master/faq.md

## Icons
 - Icon made by [Pixelmeetup](https://www.flaticon.com/authors/pixelmeetup) from [Flaticon](www.flaticon.com) is licensed by [CC 3.0 BY](http://creativecommons.org/licenses/by/3.0/)
