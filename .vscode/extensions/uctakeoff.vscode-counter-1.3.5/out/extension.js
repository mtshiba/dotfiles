'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const path = require("path");
// import * as fs from 'graceful-fs';
const LineCounter_1 = require("./LineCounter");
const Gitignore_1 = require("./Gitignore");
const JSONC = require("jsonc-parser");
const minimatch = require("minimatch");
const util_1 = require("util");
const EXTENSION_ID = 'uctakeoff.vscode-counter';
const EXTENSION_NAME = 'VSCodeCounter';
const CONFIGURATION_SECTION = 'VSCodeCounter';
const toZeroPadString = (num, fig) => num.toString().padStart(fig, '0');
const dateToString = (date) => `${date.getFullYear()}-${toZeroPadString(date.getMonth() + 1, 2)}-${toZeroPadString(date.getDate(), 2)}`
    + ` ${toZeroPadString(date.getHours(), 2)}:${toZeroPadString(date.getMinutes(), 2)}:${toZeroPadString(date.getSeconds(), 2)}`;
const toStringWithCommas = (obj) => {
    if (typeof obj === 'number') {
        return new Intl.NumberFormat('en-US').format(obj);
    }
    else {
        return obj.toString();
    }
};
const log = (message) => console.log(`[${EXTENSION_NAME}] ${new Date().toISOString()} ${message}`);
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    let version = "-";
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    if (ext !== undefined && (typeof ext.packageJSON.version === 'string')) {
        version = ext.packageJSON.version;
    }
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    log(`${EXTENSION_ID} ver.${version} now active! : ${context.extensionPath}`);
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    const codeCountController = new CodeCounterController();
    context.subscriptions.push(codeCountController, vscode.commands.registerCommand('extension.vscode-counter.countInWorkspace', () => codeCountController.countInWorkspace()), vscode.commands.registerCommand('extension.vscode-counter.countInDirectory', (targetDir) => codeCountController.countInDirectory(targetDir)), vscode.commands.registerCommand('extension.vscode-counter.countInFile', () => codeCountController.toggleVisible()), vscode.commands.registerCommand('extension.vscode-counter.outputAvailableLanguages', () => codeCountController.outputAvailableLanguages()));
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;
const workspaceFolders = () => {
    const folders = vscode.workspace.workspaceFolders;
    return !folders ? [] : folders;
};
class CodeCounterController {
    constructor() {
        this.configuration = vscode.workspace.getConfiguration(CONFIGURATION_SECTION);
        this.codeCounter_ = null;
        // subscribe to selection change and editor activation events
        let subscriptions = [];
        vscode.window.onDidChangeActiveTextEditor(this.onDidChangeActiveTextEditor, this, subscriptions);
        vscode.workspace.onDidChangeConfiguration(this.onDidChangeConfiguration, this, subscriptions);
        vscode.workspace.onDidChangeTextDocument(this.onDidChangeTextDocument, this, subscriptions);
        vscode.workspace.onDidChangeWorkspaceFolders(this.onDidChangeWorkspaceFolders, this, subscriptions);
        // create a combined disposable from both event subscriptions
        this.disposable = vscode.Disposable.from(...subscriptions);
        if (this.isVisible) {
            this.codeCounter.countCurrentFile();
        }
    }
    dispose() {
        this.disposable.dispose();
        this.disposeCodeCounter();
    }
    get codeCounter() {
        if (this.codeCounter_ === null) {
            this.codeCounter_ = new CodeCounter(this.configuration);
        }
        return this.codeCounter_;
    }
    disposeCodeCounter() {
        if (this.codeCounter_ !== null) {
            this.codeCounter_.dispose();
            this.codeCounter_ = null;
        }
    }
    get isVisible() {
        return this.configuration.get('showInStatusBar', false);
    }
    toggleVisible() {
        this.configuration.update('showInStatusBar', !this.isVisible);
    }
    outputAvailableLanguages() {
        this.codeCounter.outputAvailableLanguages();
    }
    countInDirectory(targetDir) {
        try {
            const folders = workspaceFolders();
            if (folders.length <= 0) {
                vscode.window.showErrorMessage(`[${EXTENSION_NAME}] No open workspace`);
            }
            else if (targetDir !== undefined) {
                this.codeCounter.countLinesInDirectory(targetDir, folders[0].uri);
            }
            else {
                const option = {
                    value: folders[0].uri.toString(true),
                    placeHolder: "Input Directory Path",
                    prompt: "Input Directory Path. "
                };
                vscode.window.showInputBox(option).then(uri => {
                    if (uri !== undefined) {
                        this.codeCounter.countLinesInDirectory(vscode.Uri.parse(uri), folders[0].uri);
                    }
                });
            }
        }
        catch (e) {
            vscode.window.showErrorMessage(`[${EXTENSION_NAME}] countInDirectory() failed.`, e.message);
        }
    }
    countInWorkspace() {
        try {
            const folders = workspaceFolders();
            if (folders.length <= 0) {
                vscode.window.showErrorMessage(`[${EXTENSION_NAME}] No open workspace`);
            }
            else if (folders.length === 1) {
                this.codeCounter.countLinesInDirectory(folders[0].uri, folders[0].uri);
            }
            else {
                vscode.window.showWorkspaceFolderPick().then((folder) => {
                    if (folder) {
                        this.codeCounter.countLinesInDirectory(folder.uri, folder.uri);
                    }
                });
            }
        }
        catch (e) {
            vscode.window.showErrorMessage(`[${EXTENSION_NAME}] countInWorkspace() failed.`, e.message);
        }
    }
    onDidChangeWorkspaceFolders(e) {
        log(`onDidChangeWorkspaceFolders()`);
        e.added.forEach((f) => log(` added   [${f.index}] ${f.name} : ${f.uri}`));
        e.removed.forEach((f) => log(` removed [${f.index}] ${f.name} : ${f.uri}`));
        workspaceFolders().forEach((f) => log(` [${f.index}] ${f.name} : ${f.uri}`));
    }
    onDidChangeActiveTextEditor(e) {
        if (this.codeCounter_ !== null) {
            log(`onDidChangeActiveTextEditor(${!e ? 'undefined' : e.document.uri})`);
            this.codeCounter.countFile((e !== undefined) ? e.document : undefined);
        }
    }
    onDidChangeTextDocument(e) {
        if (this.codeCounter_ !== null) {
            log(`onDidChangeTextDocument(${e.document.uri})`);
            this.codeCounter.countFile(e.document);
        }
    }
    onDidChangeConfiguration() {
        const newConf = vscode.workspace.getConfiguration(CONFIGURATION_SECTION);
        if (JSON.stringify(this.configuration) !== JSON.stringify(newConf)) {
            log(`onDidChangeConfiguration()`);
            this.configuration = newConf;
            this.disposeCodeCounter();
            if (this.isVisible) {
                this.codeCounter.countCurrentFile();
            }
        }
    }
}
const encodingTable = new Map([
    ['big5hkscs', 'big5-hkscs'],
    // ['cp437',        ''],
    // ['cp850',        ''],
    // ['cp852',        ''],
    // ['cp865',        ''],
    // ['cp866',        ''],
    // ['cp950',        ''],
    ['eucjp', 'euc-jp'],
    ['euckr', 'euc-kr'],
    // ['gb18030',      ''],
    // ['gb2312',       ''],
    // ['gbk',          ''],
    // ['iso88591',     ''],
    // ['iso885910',    ''],
    // ['iso885911',    ''],
    // ['iso885913',    ''],
    // ['iso885914',    ''],
    // ['iso885915',    ''],
    // ['iso88592',     ''],
    // ['iso88593',     ''],
    // ['iso88594',     ''],
    // ['iso88595',     ''],
    // ['iso88596',     ''],
    // ['iso88597',     ''],
    // ['iso88598',     ''],
    // ['iso88599',     ''],
    ['iso885916', 'iso-8859-16'],
    ['koi8r', 'koi8-r'],
    ['koi8ru', 'koi8-ru'],
    ['koi8t', 'koi8-t'],
    ['koi8u', 'koi8-u'],
    ['macroman', 'x-mac-roman'],
    ['shiftjis', 'shift-jis'],
    ['utf16be', 'utf-16be'],
    ['utf16le', 'utf-16le'],
    // ['utf8',         ''],
    ['utf8bom', 'utf8'],
    ['windows1250', 'windows-1250'],
    ['windows1251', 'windows-1251'],
    ['windows1252', 'windows-1252'],
    ['windows1253', 'windows-1253'],
    ['windows1254', 'windows-1254'],
    ['windows1255', 'windows-1255'],
    ['windows1256', 'windows-1256'],
    ['windows1257', 'windows-1257'],
    ['windows1258', 'windows-1258'],
    ['windows874', 'windows-874'],
]);
const buildUri = (uri, filename) => uri.with({ path: `${uri.path}/${filename}` });
const dirUri = (uri) => uri.with({ path: path.dirname(uri.path) });
function readFileAll(fileUris) {
    const ret = new Array();
    return new Promise((resolve, reject) => {
        if (fileUris.length > 0) {
            fileUris.forEach(fileUri => {
                vscode.workspace.fs.readFile(fileUri).then(data => {
                    log(`readfile : ${fileUri} : ${data.length}B`);
                    ret.push({ uri: fileUri, data: data });
                    if (ret.length === fileUris.length) {
                        resolve(ret);
                    }
                }, (reason) => {
                    log(`readfile : ${fileUri} : error ${reason}`);
                    ret.push({ uri: fileUri, data: null, error: reason });
                    if (ret.length === fileUris.length) {
                        resolve(ret);
                    }
                });
            });
        }
        else {
            resolve(ret);
        }
    });
}
class CodeCounter {
    constructor(configuration) {
        this.outputChannel = null;
        this.statusBarItem = null;
        log(`build CodeCounter start`);
        this.configuration = configuration;
        const confFiles = vscode.workspace.getConfiguration("files", null);
        this.langExtensions = loadLanguageExtensions();
        this.lineCounterTable = new LineCounterTable(this.langExtensions, this.configuration, [...Object.entries(confFiles.get('associations', {}))]);
        if (this.getConf('showInStatusBar', false)) {
            this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        }
        log(`create CodeCounter end`);
    }
    dispose() {
        if (this.statusBarItem !== null) {
            this.statusBarItem.dispose();
        }
        if (this.outputChannel !== null) {
            this.outputChannel.dispose();
        }
        log(`dispose CodeCounter`);
    }
    getConf(section, defaultValue) {
        return this.configuration.get(section, defaultValue);
    }
    toOutputChannel(text) {
        if (this.outputChannel === null) {
            this.outputChannel = vscode.window.createOutputChannel(EXTENSION_NAME);
        }
        this.outputChannel.show();
        this.outputChannel.appendLine(text);
    }
    outputAvailableLanguages() {
        this.langExtensions.forEach((lang) => {
            this.toOutputChannel(`${lang.id} : aliases[${lang.aliases}], extensions[${lang.extensions}], filenames:[${lang.filenames}]`);
        });
        this.toOutputChannel(`VS Code Counter : available all ${this.langExtensions.length} languages.`);
    }
    countLinesInDirectory(targetUri, outputDirUri) {
        // const outputDir = path.resolve(outputDirUri.fsPath, this.getConf('outputDirectory', '.VSCodeCounter'));
        const outputDir = buildUri(outputDirUri, this.getConf('outputDirectory', '.VSCodeCounter'));
        log(`countLinesInDirectory : ${targetUri}, output dir: ${outputDir}`);
        const confFiles = vscode.workspace.getConfiguration("files", null);
        const includes = this.getConf('include', ['**/*']);
        const excludes = this.getConf('exclude', []);
        if (this.getConf('useFilesExclude', true)) {
            excludes.push(...Object.keys(confFiles.get('exclude', {})));
        }
        const encoding = confFiles.get('encoding', 'utf8');
        const decoder = new util_1.TextDecoder(encodingTable.get(encoding) || encoding);
        const decoderU8 = new util_1.TextDecoder('utf8');
        excludes.push(vscode.workspace.asRelativePath(outputDir));
        log(`includes : "${includes.join('", "')}"`);
        log(`excludes : "${excludes.join('", "')}"`);
        new Promise((resolve, reject) => {
            vscode.workspace.findFiles(`{${includes.join(',')}}`, `{${excludes.join(',')}}`).then((files) => {
                const fileUris = files.filter(uri => uri.path.startsWith(targetUri.path));
                if (this.getConf('useGitignore', true)) {
                    log(`target : ${fileUris.length} files -> use .gitignore`);
                    vscode.workspace.findFiles('**/.gitignore', '').then((gitignoreFiles) => {
                        gitignoreFiles.forEach(f => log(`use gitignore : ${f}`));
                        readFileAll(gitignoreFiles.sort()).then((values) => {
                            const gitignores = new Gitignore_1.default('').merge(...values.map(p => new Gitignore_1.default(decoderU8.decode(p.data), dirUri(p.uri).fsPath)));
                            resolve(fileUris.filter(p => gitignores.excludes(p.fsPath)));
                        }, reject);
                        // const t = .map(p => vscode.workspace.fs.readFile(p));
                        // const gitignores = new Gitignore('').merge(...gitignoreFiles.map(uri => uri.fsPath).sort().map(p => new Gitignore(fs.readFileSync(p, 'utf8'), path.dirname(p))));
                        // resolve(fileUris.filter(p => gitignores.excludes(p.fsPath)));
                    }, reject);
                }
                else {
                    resolve(fileUris);
                }
            });
        }).then((fileUris) => {
            log(`target : ${fileUris.length} files`);
            return new Promise((resolve, reject) => {
                const results = [];
                if (fileUris.length <= 0) {
                    resolve(results);
                }
                const ignoreUnsupportedFile = this.getConf('ignoreUnsupportedFile', true);
                let fileCount = 0;
                fileUris.forEach(fileUri => {
                    const lineCounter = this.lineCounterTable.getByUri(fileUri);
                    if (lineCounter !== undefined) {
                        /*
                                                fs.readFile(fileUri.fsPath, encoding, (err, data) => {
                                                    ++fileCount;
                                                    if (err) {
                                                        this.toOutputChannel(`"${fileUri}" Read Error : ${err.message}.`);
                                                        results.push(new Result(fileUri, '(Read Error)'));
                                                    } else {
                                                        results.push(new Result(fileUri, lineCounter.languageId, lineCounter.count(data)));
                                                    }
                                                    if (fileCount === fileUris.length) {
                                                        resolve(results);
                                                    }
                                                });
                        */
                        vscode.workspace.fs.readFile(fileUri).then(data => {
                            ++fileCount;
                            try {
                                results.push(new Result(fileUri, lineCounter.languageId, lineCounter.count(decoder.decode(data))));
                            }
                            catch (e) {
                                this.toOutputChannel(`"${fileUri}" Read Error : ${e.message}.`);
                                results.push(new Result(fileUri, '(Read Error)'));
                            }
                            if (fileCount === fileUris.length) {
                                resolve(results);
                            }
                        }, (reason) => {
                            this.toOutputChannel(`"${fileUri}" Read Error : ${reason}.`);
                            results.push(new Result(fileUri, '(Read Error)'));
                        });
                    }
                    else {
                        if (!ignoreUnsupportedFile) {
                            results.push(new Result(fileUri, '(Unsupported)'));
                        }
                        ++fileCount;
                        if (fileCount === fileUris.length) {
                            resolve(results);
                        }
                    }
                });
            });
        }).then((results) => {
            outputResults(targetUri, results, outputDir, this.configuration);
        }).catch((reason) => {
            vscode.window.showErrorMessage(`[${EXTENSION_NAME}] countLinesInDirectory() failed.`, reason);
        });
    }
    countFile_(doc) {
        if (doc !== undefined) {
            const lineCounter = this.lineCounterTable.getById(doc.languageId) || this.lineCounterTable.getByUri(doc.uri);
            log(`${doc.uri}: ${JSON.stringify(lineCounter)}`);
            if (lineCounter !== undefined) {
                const result = lineCounter.count(doc.getText());
                // return `Code:${result.code} Comment:${result.comment} Blank:${result.blank} Total:${result.code+result.comment+result.blank}`;
                return `Code:${result.code} Comment:${result.comment} Blank:${result.blank}`;
            }
        }
        return `${EXTENSION_NAME}:Unsupported`;
    }
    countFile(doc) {
        if (this.statusBarItem !== null) {
            this.statusBarItem.show();
            this.statusBarItem.text = this.countFile_(doc);
        }
    }
    countCurrentFile() {
        // Get the current text editor
        const editor = vscode.window.activeTextEditor;
        if (editor !== undefined) {
            this.countFile(editor.document);
        }
        else {
            this.countFile(undefined);
        }
    }
}
class VscodeLangExtension {
    constructor(extensionPath, language) {
        this.extensionPath = extensionPath;
        this.id = language.id;
        this.aliases = language.aliases !== undefined ? language.aliases : [];
        this.filenames = language.filenames !== undefined ? language.filenames : [];
        this.extensions = language.extensions !== undefined ? language.extensions : [];
        this.configuration = language.configuration !== undefined ? vscode.Uri.file(path.join(this.extensionPath, language.configuration)) : undefined;
    }
}
function loadLanguageExtensions() {
    const ret = [];
    vscode.extensions.all.forEach(ex => {
        const contributes = ex.packageJSON.contributes;
        if (contributes !== undefined) {
            const languages = contributes.languages;
            if (languages !== undefined) {
                languages.forEach(l => ret.push(new VscodeLangExtension(ex.extensionPath, l)));
            }
        }
    });
    return ret;
}
class LineCounterTable {
    constructor(langExtensions, conf, associations) {
        this.langIdTable = new Map();
        this.aliasTable = new Map();
        this.fileextRules = new Map();
        this.filenameRules = new Map();
        this.associations = associations;
        log(`associations : ${this.associations.length}\n[${this.associations.join("],[")}]`);
        const confJsonTable = new Map();
        const decoderU8 = new util_1.TextDecoder('utf8');
        langExtensions.forEach(lang => {
            // log(`${lang.id} : aliases[${lang.aliases}], extensions[${lang.extensions}], filenames:[${lang.filenames}], configuration:[${lang.configuration}]`);
            const lineCounter = getOrSetFirst(this.langIdTable, lang.id, () => new LineCounter_1.default(lang.id));
            lineCounter.addAlias(lang.aliases);
            lang.aliases.forEach((alias) => {
                this.aliasTable.set(alias, lineCounter);
            });
            const confpath = lang.configuration;
            if (confpath !== undefined) {
                vscode.workspace.fs.readFile(confpath).then(data => {
                    // log(`"${confpath}" : ${data.length}B`);
                    const v = getOrSetFirst(confJsonTable, confpath.toString(), () => JSONC.parse(decoderU8.decode(data)));
                    // log(`  ${JSON.stringify(v)}`);
                    lineCounter.addCommentRule(v.comments);
                });
            }
            lang.extensions.forEach(ex => this.fileextRules.set(ex.startsWith('.') ? ex : `.${ex}`, lineCounter));
            lang.filenames.forEach(ex => this.filenameRules.set(ex, lineCounter));
        });
        class BlockPattern {
            constructor() {
                this.types = [];
                this.patterns = [];
            }
        }
        conf.get('blockComment', []).forEach(patterns => {
            patterns.types.forEach(id => {
                const lineCounter = this.getById(id) || this.getByPath(id);
                if (lineCounter) {
                    // log(`addBlockStringRule("${id}",  ${tokenPairs.map(t => t.begin + t.end).join('|')}) => [${lineCounter.name}]`);
                    lineCounter.addBlockStringRule(...patterns.patterns.map(pat => { return { begin: pat[0], end: pat[1] }; }));
                }
            });
        });
        // log(`confJsonTable : ${confJsonTable.size}  =======================================================================`);
        // confJsonTable.forEach((v, n) => { log(`${n}:\n ${JSON.stringify(v)}`); });
        // log(`this.filenameRules : ${this.filenameRules.size}  =======================================================================`);
        // this.filenameRules.forEach((v, n) => { log(`${n}\t ${JSON.stringify(v)}`); });
        // log(`this.fileextRules : ${this.fileextRules.size}  =======================================================================`);
        // this.fileextRules.forEach((v, n) => { log(`${n}\t ${JSON.stringify(v)}`); });
        // log(`this.langIdTable : ${this.langIdTable.size}  =======================================================================`);
        // this.langIdTable.forEach((v, n) => { log(`${n}\t ${JSON.stringify(v)}`); });
        // log(`this.aliasTable : ${this.aliasTable.size}  =======================================================================`);
        // this.aliasTable.forEach((v, n) => { log(`${n}\t ${JSON.stringify(v)}`); });
    }
    getById(langId) {
        return this.langIdTable.get(langId) || this.aliasTable.get(langId);
    }
    getByPath(filePath) {
        const lineCounter = this.fileextRules.get(filePath) || this.fileextRules.get(path.extname(filePath)) || this.filenameRules.get(path.basename(filePath));
        if (lineCounter !== undefined) {
            return lineCounter;
        }
        const patType = this.associations.find(([pattern,]) => minimatch(filePath, pattern, { matchBase: true }));
        //log(`## ${filePath}: ${patType}`);
        return (patType !== undefined) ? this.getById(patType[1]) : undefined;
    }
    getByUri(uri) {
        return this.getByPath(uri.path);
    }
}
async function outputResults(workspaceUri, results, outputDirUri, conf) {
    const resultTable = new ResultTable(workspaceUri, results, conf.get('printNumberWithCommas', true) ? toStringWithCommas : (obj) => obj.toString());
    const endOfLine = conf.get('endOfLine', '\n');
    log(`count ${results.length} files`);
    if (results.length <= 0) {
        vscode.window.showErrorMessage(`[${EXTENSION_NAME}] There was no target file.`);
        return;
    }
    const previewType = conf.get('outputPreviewType', '');
    log(`OutputDir : ${outputDirUri}`);
    await makeDirectories(outputDirUri);
    if (conf.get('outputAsText', true)) {
        const resultsUri = buildUri(outputDirUri, 'results.txt');
        const promise = writeTextFile(resultsUri, resultTable.toTextLines().join(endOfLine));
        if (previewType === 'text') {
            promise.then(() => showTextFile(resultsUri)).catch(err => console.error(err));
        }
        else {
            promise.catch(err => console.error(err));
        }
    }
    if (conf.get('outputAsCSV', true)) {
        const resultsUri = buildUri(outputDirUri, 'results.csv');
        const promise = writeTextFile(resultsUri, resultTable.toCSVLines().join(endOfLine));
        if (previewType === 'csv') {
            promise.then(() => showTextFile(resultsUri)).catch(err => console.error(err));
        }
        else {
            promise.catch(err => console.error(err));
        }
    }
    if (conf.get('outputAsMarkdown', true)) {
        const detailsUri = buildUri(outputDirUri, 'details.md');
        const resultsUri = buildUri(outputDirUri, 'results.md');
        const promise = conf.get('outputMarkdownSeparately.', true)
            ? writeTextFile(detailsUri, [
                '# Details',
                '',
                ...resultTable.toMarkdownHeaderLines(),
                '',
                `[summary](results.md)`,
                '',
                ...resultTable.toMarkdownDetailsLines(),
                '',
                `[summary](results.md)`,
            ].join(endOfLine)).then(() => writeTextFile(resultsUri, [
                '# Summary',
                '',
                ...resultTable.toMarkdownHeaderLines(),
                '',
                `[details](details.md)`,
                '',
                ...resultTable.toMarkdownSummaryLines(),
                '',
                `[details](details.md)`
            ].join(endOfLine)))
            : writeTextFile(resultsUri, [
                ...resultTable.toMarkdownHeaderLines(),
                '',
                ...resultTable.toMarkdownSummaryLines(),
                '',
                ...resultTable.toMarkdownDetailsLines(),
            ].join(endOfLine));
        if (previewType === 'markdown') {
            promise.then(() => vscode.commands.executeCommand("markdown.showPreview", resultsUri))
                .catch(err => console.error(err));
        }
        else {
            promise.catch(err => console.error(err));
        }
    }
}
class Result {
    constructor(uri, language, value = { code: -1, comment: 0, blank: 0 }) {
        this.code = 0;
        this.comment = 0;
        this.blank = 0;
        this.uri = uri;
        this.filename = uri.fsPath;
        this.language = language;
        this.code = value.code;
        this.comment = value.comment;
        this.blank = value.blank;
    }
    get total() {
        return this.code + this.comment + this.blank;
    }
}
class Statistics {
    constructor(name) {
        this.files = 0;
        this.code = 0;
        this.comment = 0;
        this.blank = 0;
        this.name = name;
    }
    get total() {
        return this.code + this.comment + this.blank;
    }
    append(result) {
        this.files++;
        this.code += result.code;
        this.comment += result.comment;
        this.blank += result.blank;
        return this;
    }
}
class MarkdownTableFormatter {
    constructor(valueToString, ...columnInfo) {
        this.valueToString = valueToString;
        this.columnInfo = columnInfo;
    }
    get lineSeparator() {
        return '| ' + this.columnInfo.map(i => (i.format === 'number') ? '---:' : ':---').join(' | ') + ' |';
    }
    get headerLines() {
        return ['| ' + this.columnInfo.map(i => i.title).join(' | ') + ' |', this.lineSeparator];
    }
    line(...data) {
        return '| ' + data.map((d, i) => {
            if (typeof d === 'number') {
                return this.valueToString(d);
            }
            if (typeof d === 'string') {
                return d;
            }
            // return `[${path.relative(this.dir, d.fsPath)}](${d})`;
            return `[${vscode.workspace.asRelativePath(d)}](/${vscode.workspace.asRelativePath(d)})`;
        }).join(' | ') + ' |';
    }
}
class ResultTable {
    constructor(workspaceUri, results, valueToString = (obj) => obj.toString()) {
        this.fileResults = [];
        this.dirResultTable = new Map();
        this.langResultTable = new Map();
        this.total = new Statistics('Total');
        this.targetDirPath = workspaceUri.fsPath;
        this.fileResults = results;
        this.valueToString = valueToString;
        results
            .filter((result) => result.code >= 0)
            .forEach((result) => {
            let parent = path.dirname(path.relative(this.targetDirPath, result.filename));
            while (parent.length >= 0) {
                getOrSetFirst(this.dirResultTable, parent, () => new Statistics(parent)).append(result);
                const p = path.dirname(parent);
                if (p === parent) {
                    break;
                }
                parent = p;
            }
            getOrSetFirst(this.langResultTable, result.language, () => new Statistics(result.language)).append(result);
            this.total.append(result);
        });
    }
    /*
        public toCSVLines() {
            const languages = [...this.langResultTable.keys()];
            return [
                `filename, language, ${languages.join(', ')}, comment, blank, total`,
                ...this.fileResults.sort((a,b) => a.filename < b.filename ? -1 : a.filename > b.filename ? 1 : 0)
                    .map(v => `${v.filename}, ${v.language}, ${languages.map(l => l === v.language ? v.code : 0).join(', ')}, ${v.comment}, ${v.blank}, ${v.total}`),
                `Total, -, ${[...this.langResultTable.values()].map(r => r.code).join(', ')}, ${this.total.comment}, ${this.total.blank}, ${this.total.total}`
            ];
        }
    */
    toCSVLines() {
        const languages = [...this.langResultTable.keys()];
        return [
            `"filename", "language", "${languages.join('", "')}", "comment", "blank", "total"`,
            ...this.fileResults.sort((a, b) => a.filename < b.filename ? -1 : a.filename > b.filename ? 1 : 0)
                .map(v => `"${v.filename}", "${v.language}", ${languages.map(l => l === v.language ? v.code : 0).join(', ')}, ${v.comment}, ${v.blank}, ${v.total}`),
            `"Total", "-", ${[...this.langResultTable.values()].map(r => r.code).join(', ')}, ${this.total.comment}, ${this.total.blank}, ${this.total.total}`
        ];
    }
    toTextLines() {
        class TextTableFormatter {
            constructor(valueToString, ...columnInfo) {
                this.valueToString = valueToString;
                this.columnInfo = columnInfo;
                for (const info of this.columnInfo) {
                    info.width = Math.max(info.title.length, info.width);
                }
            }
            get lineSeparator() {
                return '+-' + this.columnInfo.map(i => '-'.repeat(i.width)).join('-+-') + '-+';
            }
            get headerLines() {
                return [this.lineSeparator, '| ' + this.columnInfo.map(i => i.title.padEnd(i.width)).join(' | ') + ' |', this.lineSeparator];
            }
            get footerLines() {
                return [this.lineSeparator];
            }
            line(...data) {
                return '| ' + data.map((d, i) => {
                    if (typeof d === 'string') {
                        return d.padEnd(this.columnInfo[i].width);
                    }
                    else {
                        return this.valueToString(d).padStart(this.columnInfo[i].width);
                    }
                }).join(' | ') + ' |';
            }
        }
        const maxNamelen = Math.max(...this.fileResults.map(res => res.filename.length));
        const maxLanglen = Math.max(...[...this.langResultTable.keys()].map(l => l.length));
        const resultFormat = new TextTableFormatter(this.valueToString, { title: 'filename', width: maxNamelen }, { title: 'language', width: maxLanglen }, { title: 'code', width: 10 }, { title: 'comment', width: 10 }, { title: 'blank', width: 10 }, { title: 'total', width: 10 });
        const dirFormat = new TextTableFormatter(this.valueToString, { title: 'path', width: maxNamelen }, { title: 'files', width: 10 }, { title: 'code', width: 10 }, { title: 'comment', width: 10 }, { title: 'blank', width: 10 }, { title: 'total', width: 10 });
        const langFormat = new TextTableFormatter(this.valueToString, { title: 'language', width: maxLanglen }, { title: 'files', width: 10 }, { title: 'code', width: 10 }, { title: 'comment', width: 10 }, { title: 'blank', width: 10 }, { title: 'total', width: 10 });
        return [
            // '='.repeat(resultFormat.headerLines[0].length),
            // EXTENSION_NAME,
            `Date : ${dateToString(new Date())}`,
            `Directory : ${this.targetDirPath}`,
            // `Total : code: ${this.total.code}, comment : ${this.total.comment}, blank : ${this.total.blank}, all ${this.total.total} lines`,
            `Total : ${this.total.files} files,  ${this.total.code} codes, ${this.total.comment} comments, ${this.total.blank} blanks, all ${this.total.total} lines`,
            '',
            'Languages',
            ...langFormat.headerLines,
            ...[...this.langResultTable.values()].sort((a, b) => b.code - a.code)
                .map(v => langFormat.line(v.name, v.files, v.code, v.comment, v.blank, v.total)),
            ...langFormat.footerLines,
            '',
            'Directories',
            ...dirFormat.headerLines,
            ...[...this.dirResultTable.values()].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
                .map(v => dirFormat.line(v.name, v.files, v.code, v.comment, v.blank, v.total)),
            ...dirFormat.footerLines,
            '',
            'Files',
            ...resultFormat.headerLines,
            ...this.fileResults.sort((a, b) => a.filename < b.filename ? -1 : a.filename > b.filename ? 1 : 0)
                .map(v => resultFormat.line(v.filename, v.language, v.code, v.comment, v.blank, v.total)),
            resultFormat.line('Total', '', this.total.code, this.total.comment, this.total.blank, this.total.total),
            ...resultFormat.footerLines,
        ];
    }
    toMarkdownHeaderLines() {
        return [
            `Date : ${dateToString(new Date())}`,
            '',
            `Directory ${this.targetDirPath}`,
            '',
            `Total : ${this.total.files} files,  ${this.total.code} codes, ${this.total.comment} comments, ${this.total.blank} blanks, all ${this.total.total} lines`,
        ];
    }
    toMarkdownSummaryLines() {
        const dirFormat = new MarkdownTableFormatter(this.valueToString, { title: 'path', format: 'string' }, { title: 'files', format: 'number' }, { title: 'code', format: 'number' }, { title: 'comment', format: 'number' }, { title: 'blank', format: 'number' }, { title: 'total', format: 'number' });
        const langFormat = new MarkdownTableFormatter(this.valueToString, { title: 'language', format: 'string' }, { title: 'files', format: 'number' }, { title: 'code', format: 'number' }, { title: 'comment', format: 'number' }, { title: 'blank', format: 'number' }, { title: 'total', format: 'number' });
        return [
            '## Languages',
            ...langFormat.headerLines,
            ...[...this.langResultTable.values()].sort((a, b) => b.code - a.code)
                .map(v => langFormat.line(v.name, v.files, v.code, v.comment, v.blank, v.total)),
            '',
            '## Directories',
            ...dirFormat.headerLines,
            ...[...this.dirResultTable.values()].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
                .map(v => dirFormat.line(v.name, v.files, v.code, v.comment, v.blank, v.total)),
        ];
    }
    toMarkdownDetailsLines() {
        const resultFormat = new MarkdownTableFormatter(this.valueToString, { title: 'filename', format: 'uri' }, { title: 'language', format: 'string' }, { title: 'code', format: 'number' }, { title: 'comment', format: 'number' }, { title: 'blank', format: 'number' }, { title: 'total', format: 'number' });
        return [
            '## Files',
            ...resultFormat.headerLines,
            ...this.fileResults.sort((a, b) => a.filename < b.filename ? -1 : a.filename > b.filename ? 1 : 0)
                .map(v => resultFormat.line(v.uri, v.language, v.code, v.comment, v.blank, v.total)),
        ];
    }
}
function getOrSetFirst(map, key, otherwise) {
    let v = map.get(key);
    if (v === undefined) {
        v = otherwise();
        map.set(key, v);
    }
    return v;
}
/*
function makeDirectories(dirpath: string) {
    if (fs.existsSync(dirpath)) {
        return true;
    }
    const parent = path.dirname(dirpath);
    if ((parent !== dirpath) && makeDirectories(parent)) {
        fs.mkdirSync(dirpath);
        return true;
    } else {
        return false;
    }
}
function showTextFile(outputFilename: string) {
    log(`showTextFile : ${outputFilename}`);
    return new Promise((resolve: (editor: vscode.TextEditor)=> void, reject: (err: any) => void) => {
        vscode.workspace.openTextDocument(outputFilename)
        .then((doc) => {
            return vscode.window.showTextDocument(doc, vscode.ViewColumn.One, true);
        }, err => {
            reject(err);
        }).then((editor) => {
            resolve(editor);
        }, err => {
            reject(err);
        });
    });
}
function writeTextFile(outputFilename: string, text: string) {
    log(`writeTextFile : ${outputFilename} ${text.length}B`);
    return new Promise((resolve: (filename: string)=> void, reject: (err: NodeJS.ErrnoException) => void) => {
        fs.writeFile(outputFilename, text, err => {
            if (err) {
                reject(err);
            } else {
                resolve(outputFilename);
            }
        });
    });
}
*/
function makeDirectories_(dirpath, resolve, reject) {
    // log(`makeDirectories ${dirpath}`);
    vscode.workspace.fs.stat(dirpath).then((value) => {
        if (value.type !== vscode.FileType.File) {
            resolve();
        }
        else {
            reject(`${dirpath} is not directory.`);
        }
    }, (reason) => {
        log(`vscode.workspace.fs.stat failed: ${reason}`);
        const curPath = dirpath.path;
        const parent = path.dirname(curPath);
        if (parent !== curPath) {
            makeDirectories_(dirpath.with({ path: parent }), () => {
                log(`vscode.workspace.fs.createDirectory ${dirpath}`);
                vscode.workspace.fs.createDirectory(dirpath).then(resolve, reject);
            }, reject);
        }
        else {
            reject(reason);
        }
    });
}
function makeDirectories(dirpath) {
    return new Promise((resolve, reject) => makeDirectories_(dirpath, resolve, reject));
}
function showTextFile(uri) {
    log(`showTextFile : ${uri}`);
    return new Promise((resolve, reject) => {
        vscode.workspace.openTextDocument(uri)
            .then((doc) => vscode.window.showTextDocument(doc, vscode.ViewColumn.One, true), reject)
            .then(resolve, reject);
    });
}
function writeTextFile(uri, text) {
    log(`writeTextFile : ${uri} ${text.length}B`);
    return new Promise((resolve, reject) => {
        vscode.workspace.fs.writeFile(uri, new util_1.TextEncoder().encode(text)).then(resolve, reject);
    });
}
//# sourceMappingURL=extension.js.map