'use babel';

import { CompositeDisposable } from 'atom';
const config = {
    enableOnFile: true,
    enableOnFolder: true,
};
export default {
    config: {
        enableOnFile: {
            type: 'boolean',
            default: true,
            description: 'Double click on a file to open it, otherwise single click to open it.'
        },
        enableOnFolder: {
            type: 'boolean',
            default: true,
            description: 'Double click on a folder to open it, otherwise single click to open it.'
        }
    },
    observeConfig() {
        ['enableOnFile', 'enableOnFolder'].forEach((prop) => {
            atom.config.observe(`dbclick-tree-view-temp.${prop}`, (value) => {
                config[prop] = value;
            });
        });
    },
    activate(state) {
        this.disposables = new CompositeDisposable();
        if (atom.project.getPaths().length === 0) {
            this.disposables.add(atom.project.onDidChangePaths(() => {
                if (this.treeView) {
                    const pane = atom.workspace.paneForItem(this.treeView);
                    if (pane) {
                        pane.removeItem(this.treeView)
                    }
                }
                this.disposables.dispose();
                this.disposables = null;
            }));
        }
        this.observeConfig();
        return atom.packages.activatePackage('tree-view-master').then((treeViewPkg) => {
            if (treeViewPkg.mainModule.createView) {
                this.treeView = treeViewPkg.mainModule.createView();
            } else {
                this.treeView = treeViewPkg.mainModule.getTreeViewInstance();
            }
            this.treeView.originalEntryClicked = this.treeView.entryClicked;
            const ctx = this;
            this.treeView.entryClicked = function(e) {
                let entry = e.target.closest('.entry');
                if (!entry) {
                    return;
                }
                let isRecursive = e.altKey || false;
                if (e.detail == 1) {
                    if (!config.enableOnFile && ctx.isFile(entry)) {
                        if (ctx.isPendingPaneAllowed()) {
                            return this.fileViewEntryClicked(e);
                        }
                        this.selectEntry(entry);
                        this.openSelectedEntry();
                        return;
                    }
                    this.selectEntry(entry);
                    if (
                        ctx.isDirectory(entry) &&
                        (ctx.isClickOnArrow(e) || !config.enableOnFolder)
                    ) {
                        entry.toggleExpansion(isRecursive);
                    }
                } else if (e.detail == 2) {
                    if (ctx.isDirectory(entry) && config.enableOnFolder) {
                        entry.toggleExpansion(isRecursive);
                    } else if (ctx.isFile(entry)) {
                        this.fileViewEntryClicked(e);
                    }
                }
            }
        });
    },
    isPendingPaneAllowed() {
        return atom.config.get('core.allowPendingPaneItems');
    },
    isDirectory(entry) {
        return entry.classList.contains('directory');
    },
    isFile(entry) {
        return entry.classList.contains('file');
    },
    isClickOnArrow(e) {
        return e.offsetX <= 10;
    },
    deactivate() {
        if (this.disposables) {
            this.disposables.dispose();
        }
        this.treeView.entryClicked = this.treeView.originalEntryClicked;
        delete this.treeView.originalEntryClicked;
    },

    entryDoubleClicked(e) {
        return this.originalEntryClicked(e);
    }
};
