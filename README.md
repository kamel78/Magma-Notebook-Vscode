# Magma Notebook 

This extension adds language support for the Magma computational algebra system to Visual Studio Code. Its provides several features as can be seen below.

## Features

+ Syntax highlighting
+ A MagmaNotebook extension that uses the built-in notebook support from VS Code. This UI gives a number of advantages to users of notebooks:
  + Out of the box support for VS Code's vast array of basic code editing features like hot exit, find & replace, and code folding.
  + Editor extensions like VIM, bracket colorization, linters and many more are available while editing a cell.
  + Deep integration with general workbench and file-based features in VS Code.
  + Includes a notebook-friendly diff tool, making it much easier to compare and see differences between code cells, output and metadata.
  + Run several Magma environments in different Notebooks, each with corresponding variables and definitions.
+ Snippests

![alt text](https://github.com/kamel78/Magma-Notebook-Vscode/blob/main/images/screenshot1.png)

## Requirements

Installed and fully functional version of Magma (either under Windows, Mac or Linux).

## Extension Settings

This extension contributes the following settings:

* `magma.path`: Define the path to the installed magma application (ie. "C:\Program Files (x86)\Magma\" under windows, or /Applications/Magma/ under Mac)
* `magma.path`: Internal TCP port used to ensure kernel connection with magma, has to be changed only if the default port "9001" is already used by another application.

![alt text](https://github.com/kamel78/Magma-Notebook-Vscode/blob/main/images/screenshot2.png)

## IDE features

Creation of new Magma Notebbok from the File> New files... menue (custom notebook editor).

![alt text](https://github.com/kamel78/Magma-Notebook-Vscode/blob/main/images/screenshot3.png)


## Installation

### Visual Studio Code
To install the extension from Visual Studio Code use the extension panel and search for magmanotebook.

### Installing Locally
In order to install the extension locally, clone the GitHub repository under your local extensions folder:

+ Windows: %USERPROFILE%\.vscode\extensions
+ Mac / Linux: $HOME/.vscode/extensions

## License

**Magma-Notebook-Vscode** is licensed under the MIT License; see [Link](https://github.com/kamel78/Magma-Notebook-Vscode/blob/main/LICENSE "LICENSE").  for details.



Created by FARAOUN Kamel Mohamed (Jan 2023)
