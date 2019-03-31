/**
 * @license
 * 
 * MIT License
 *
 * Copyright (c) 2019 Richie Bendall
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * The main Fon class.
 * @class
 */
export class Fon {
    // Method storage
    method: any;

    // Storage size
    size: number;

    // File system requesting method
    requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

    /**
     * The main constructor.
     * @constructor
     * @param {string} method - The method of storage to use. Can be "persistent" or "temporary". Default is "temporary".
     * @param {number} size - The size of storage to use in megabytes. Default is 10.
     */
    constructor(method: string = "TEMPORARY", size: number = 10): void {
        // Set method according to function input
        this.method = method.toUpperCase() === "PERSISTENT" ? window.PERSISTENT : window.TEMPORARY

        // Set size based on function input
        size = size * 1024 * 1024

        // Request true storage quota and set the value
        if (method.toUpperCase() === "PERSISTENT" && navigator.webkitPersistentStorage) navigator.webkitPersistentStorage.requestQuota(this.method, size, grantedBytes => size = grantedBytes, e => {
            throw new Error(e)
        });
        else if (navigator.webkitTemporaryStorage) navigator.webkitTemporaryStorage.requestQuota(this.method, size, grantedBytes => size = grantedBytes, e => {
            throw new Error(e)
        });

        // Save the true value
        this.size = size
    }

    /**
     * Remove a file or folder.
     * @method
     * @param {string} dir - The directory of the file or folder to remove.
     */
    remove(dir: string): Promise<void> {
        return new Promise((resolve, reject) =>
            // Request filesystem access
            this.requestFileSystem(this.method, this.size, fs => fs.root.getFile(dir, {
                create: false
            }, fileEntry => {
                // If directory is file
                if (fileEntry.isFile) fileEntry.remove(resolve(), e => reject(e))

                // If directory is not a file
                else fs.root.getDirectory(dir, {create: false}, dirEntry => dirEntry.removeRecursively(resolve(), e => reject(e))

            }, e => reject(e)))
        )
    }

    /**
     * Rename a file or folder.
     * @method
     * @param {string} dir - The directory of the file or folder to rename.
     * @param {string} dir - The new name of the file or folder.
     */
    rename(dir: string, newdir: string): Promise<void> {
        return new Promise((resolve, reject) =>
            // Request filesystem access
            this.requestFileSystem(this.method, this.size, fs =>
                // Get the file object
                fs.getFile(dir, {}, (fileEntry) => {
                    // Move the file
                    fileEntry.moveTo(fs, newdir);
                    resolve();
                }, e => reject(e))
            ))
    }

    /**
     * Move a file or folder.
     * @method
     * @param {string} dir - The directory of the file or folder to move.
     * @param {string} dest - The destination directory.
     */
    move(dir: string, dest: string): Promise<void> {
        return new Promise((resolve, reject) =>
            // Request filesystem access
            this.requestFileSystem(this.method, this.size, fs =>
                // Get the file object
                fs.getFile(dir, {}, (fileEntry) => {
                    // Move the file to the destination directory
                    fileEntry.moveTo(fs, dest)
                    resolve()
                }, e => reject(e))
            ))
    }

    /**
     * Create a directory.
     * @method
     * @param {string} dir - The directory of the file or folder to move.
     * @param {string} dest - The destination directory.
     */
    createDir(dir: string): Promise<void> {
        return new Promise((resolve, reject) => {

            const createDir = (rootDirEntry, folders) => {
                // Remove "/" or "./"
                if (folders[0] === '.' || folders[0] === '') folders = folders.slice(1);
                rootDirEntry.getDirectory(folders[0], {
                    create: true
                }, (dirEntry) => {
                    // If there is still another folder then create it
                    if (folders.length) createDir(dirEntry, folders.slice(1));
                    else resolve()
                }, e => reject(e));
            };

            // Request filesystem access
            this.requestFileSystem(this.method, this.size, fs => createDir(fs.root, dir.split('/')), e => reject(e))
        })
    }

    /**
     * Get an array of items in a directory.
     * @method
     * @param {string} dir - The directory to scan.
     */
    readDir(dir: string): Promise<string[]> {
        return new Promise((resolve, reject) => {

            const toArray = (list) => Array.prototype.slice.call(list || [], 0);

            this.requestFileSystem(this.method, this.size, fs => {
                const dirReader = fs.root.createReader();
                let entries = [];

                // Keep calling readentries until every item done
                const readEntries = () =>
                    // Read the entries in the directory
                    dirReader.readEntries((results) => {
                        // If results non existant
                        if (!results.length)
                            resolve(entries.sort());
                        else {
                            entries = entries.concat(toArray(results));
                            readEntries();
                        }
                    }, e => reject(e));

                // Start reading directories
                readEntries();
            }, e => reject(e));
        })
    }

    /**
     * Read the contents of a file.
     * @method
     * @param {string} dir - The file to read.
     */
    readFile(dir: string): Promise<string | ArrayBuffer> {
        return new Promise((resolve, reject) => {
            // Request filesystem access
            this.requestFileSystem(this.method, this.size, fs =>
                // Get the file object
                fs.root.getFile(dir, {}, fileEntry =>
                    // Create the file reader
                    fileEntry.file(file => {
                        // Create the content reader
                        const reader = new FileReader();

                        // When finished loading
                        reader.onloadend = function(e) {
                            resolve(this.result)
                        };

                        // Start file read
                        reader.readAsText(file);
                    }, e => reject(e)), e => reject(e)), e => reject(e));
        })
    }

    /**
     * Write to a file.
     * @method
     * @param {string} dir - The file to write.
     * @param {string} content - The content to write.
     * @param {string} dir - The position in the file to start writing. The start is 0. Negative numbers start from the end. Default is 0.
     */
    writeFile(dir: string, content: string, position: number = 0): Promise<void> {
        return new Promise((resolve, reject) => {
            // Request filesystem access
            this.requestFileSystem(this.method, this.size, fs =>
                // Get the file object
                fs.root.getFile(dir, {
                        create: true
                    }, (fileEntry) =>

                    // Create a file writer
                    fileEntry.createWriter((fileWriter) => {

                        // If negative number start from end of file
                        if (0 > position) fileWriter.seek(fileWriter.length - Math.abs(position) + 1)
                        // If positive number
                        else fileWriter.seek(position)

                        // When write finished
                        fileWriter.onwriteend = resolve();

                        // When write errors
                        fileWriter.onerror = e => reject(e);

                        // Create blob
                        const blob = new Blob([content], {
                            type: "text/plain"
                        });

                        // Write to the file
                        fileWriter.write(blob);

                    }, e => reject(e)), e => reject(e)), e => reject(e));
        })
    }
}
