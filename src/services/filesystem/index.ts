/**
 * Abstraction layer for FileSystem operations to keep EYESHARP decoupled
 * from browser vs native (Tauri) execution environments.
 */

export interface VirtualFileHandle {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  nativePath?: string;
  fileObject?: File;
}

export interface IFileSystemService {
  readAsArrayBuffer(file: VirtualFileHandle): Promise<ArrayBuffer>;
  readAsText(file: VirtualFileHandle): Promise<string>;
  computeBasicFileMetadata(file: File): VirtualFileHandle;
}

export class BrowserFileSystemService implements IFileSystemService {
  computeBasicFileMetadata(file: File): VirtualFileHandle {
    return {
      id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      lastModified: file.lastModified,
      fileObject: file,
    };
  }

  async readAsArrayBuffer(handle: VirtualFileHandle): Promise<ArrayBuffer> {
    if (handle.fileObject) {
      return await handle.fileObject.arrayBuffer();
    }
    throw new Error(`Browser filesystem requires an attached File object for handle ${handle.id}`);
  }

  async readAsText(handle: VirtualFileHandle): Promise<string> {
    if (handle.fileObject) {
      return await handle.fileObject.text();
    }
    throw new Error(`Browser filesystem requires an attached File object for handle ${handle.id}`);
  }
}

// Export singleton instance
export const filesystemService: IFileSystemService = new BrowserFileSystemService();
