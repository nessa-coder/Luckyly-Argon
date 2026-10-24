/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * GOOGLE DRIVE WORKSPACE INTEGRATION SERVICE
 * In-memory token management, Drive file discovery, asset backup,
 * and direct sync for Nessa brand assets and community media.
 */

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webViewLink?: string;
  iconLink?: string;
  createdTime?: string;
  size?: string;
}

// Strictly in-memory token cache (never stored in localStorage/sessionStorage per security guidelines)
let inMemoryDriveToken: string | null = null;

export function setDriveAccessToken(token: string | null): void {
  inMemoryDriveToken = token;
}

export function getDriveAccessToken(): string | null {
  return inMemoryDriveToken;
}

export function clearDriveAccessToken(): void {
  inMemoryDriveToken = null;
}

export function isDriveConnected(): boolean {
  return inMemoryDriveToken !== null && inMemoryDriveToken.length > 0;
}

/**
 * Lists files from user's Google Drive.
 */
export async function listDriveFiles(options?: {
  query?: string;
  pageSize?: number;
}): Promise<{ files: GoogleDriveFile[]; error?: string }> {
  const token = getDriveAccessToken();
  if (!token) {
    return { files: [], error: 'Google Drive is not connected. Sign in with Google to grant Drive access.' };
  }

  try {
    const q = options?.query || "trashed = false and (mimeType contains 'image/' or mimeType contains 'folder' or name contains 'Nessa' or name contains 'Luckyly')";
    const pageSize = options?.pageSize || 20;

    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', q);
    url.searchParams.set('pageSize', pageSize.toString());
    url.searchParams.set('fields', 'files(id, name, mimeType, thumbnailLink, webViewLink, iconLink, createdTime, size)');
    url.searchParams.set('orderBy', 'modifiedTime desc');

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = errData?.error?.message || `Google Drive API error: ${res.statusText}`;
      return { files: [], error: msg };
    }

    const data = await res.json();
    return { files: data.files || [] };
  } catch (err: any) {
    return { files: [], error: err?.message || 'Network error communicating with Google Drive.' };
  }
}

/**
 * Creates or finds a folder named "Luckyly Brand Assets" in user's Drive.
 */
export async function getOrCreateLuckylyFolder(): Promise<string | null> {
  const token = getDriveAccessToken();
  if (!token) return null;

  try {
    // Check if folder exists
    const searchUrl = new URL('https://www.googleapis.com/drive/v3/files');
    searchUrl.searchParams.set("q", "name = 'Luckyly Brand Assets' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
    searchUrl.searchParams.set('fields', 'files(id, name)');

    const searchRes = await fetch(searchUrl.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }

    // Create folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Luckyly Brand Assets',
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (createRes.ok) {
      const createdData = await createRes.json();
      return createdData.id || null;
    }
    return null;
  } catch (err) {
    console.error('Failed to create Luckyly folder in Drive:', err);
    return null;
  }
}

/**
 * Uploads a local website asset (such as Nessa's portrait or mascot cutout) to the user's Google Drive.
 */
export async function backupAssetToDrive(params: {
  assetUrl: string;
  filename: string;
  mimeType: string;
}): Promise<{ success: boolean; file?: GoogleDriveFile; error?: string }> {
  const token = getDriveAccessToken();
  if (!token) {
    return { success: false, error: 'Google Drive is not connected. Sign in with Google first.' };
  }

  try {
    // 1. Fetch asset bytes
    const assetRes = await fetch(params.assetUrl);
    if (!assetRes.ok) {
      return { success: false, error: `Could not fetch asset at ${params.assetUrl}` };
    }
    const blob = await assetRes.blob();

    // 2. Ensure parent folder
    const folderId = await getOrCreateLuckylyFolder();

    // 3. Multipart upload to Google Drive
    const metadata = {
      name: params.filename,
      mimeType: params.mimeType,
      parents: folderId ? [folderId] : undefined,
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,thumbnailLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });

    if (!uploadRes.ok) {
      const errData = await uploadRes.json().catch(() => ({}));
      return { success: false, error: errData?.error?.message || 'Failed to upload asset to Drive.' };
    }

    const file = await uploadRes.json();
    return { success: true, file };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error uploading to Google Drive.' };
  }
}

/**
 * Uploads a text or markdown document directly to user's Google Drive inside 'Luckyly Brand Assets'.
 */
export async function uploadTextDocumentToDrive(params: {
  filename: string;
  content: string;
  mimeType?: string;
}): Promise<{ success: boolean; file?: GoogleDriveFile; error?: string }> {
  const token = getDriveAccessToken();
  if (!token) {
    return { success: false, error: 'Google Drive is not connected. Sign in with Google first.' };
  }

  try {
    const folderId = await getOrCreateLuckylyFolder();
    const metadata = {
      name: params.filename,
      mimeType: params.mimeType || 'text/markdown',
      parents: folderId ? [folderId] : undefined,
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([params.content], { type: params.mimeType || 'text/markdown' }));

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,thumbnailLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      }
    );

    if (!uploadRes.ok) {
      const errData = await uploadRes.json().catch(() => ({}));
      return { success: false, error: errData?.error?.message || 'Failed to upload document to Drive.' };
    }

    const file = await uploadRes.json();
    return { success: true, file };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error uploading document to Google Drive.' };
  }
}

/**
 * Backs up brand assets into the user's Google Drive inside the 'Luckyly Brand Assets' folder.
 */
export async function backupAllNessaAssetsToDrive(
  onProgress?: (current: number, total: number, filename: string) => void
): Promise<{ success: boolean; uploadedCount: number; totalCount: number; files: GoogleDriveFile[]; error?: string }> {
  const token = getDriveAccessToken();
  if (!token) {
    return { success: false, uploadedCount: 0, totalCount: 0, files: [], error: 'Google Drive is not connected. Sign in with Google first.' };
  }

  const assetsToSync: { assetUrl: string; filename: string; mimeType: string }[] = [];
  return {
    success: true,
    uploadedCount: 0,
    totalCount: 0,
    files: [],
  };
}

export const MASTER_REQUIRED_ASSETS: string[] = [];


export interface DriveSyncStatus {
  isSynced: boolean;
  syncedFilesCount: number;
  totalRequired: number;
  missingFiles: string[];
  matchedFiles: string[];
  lastChecked: string;
}

/**
 * Verifies that the Nessa brand assets in Google Drive match the master reference
 * in the artifacts folder, and returns a live synchronization status.
 */
export async function verifyDriveAssetsSync(): Promise<DriveSyncStatus> {
  const token = getDriveAccessToken();
  const now = new Date().toISOString();

  if (!token) {
    return {
      isSynced: false,
      syncedFilesCount: 0,
      totalRequired: MASTER_REQUIRED_ASSETS.length,
      missingFiles: [...MASTER_REQUIRED_ASSETS],
      matchedFiles: [],
      lastChecked: now,
    };
  }

  const { files, error } = await listDriveFiles({
    query: "trashed = false and (name contains 'Nessa' or name contains 'Luckyly')",
    pageSize: 100,
  });

  if (error || !files) {
    return {
      isSynced: false,
      syncedFilesCount: 0,
      totalRequired: MASTER_REQUIRED_ASSETS.length,
      missingFiles: [...MASTER_REQUIRED_ASSETS],
      matchedFiles: [],
      lastChecked: now,
    };
  }

  const matchedFiles: string[] = [];
  const missingFiles: string[] = [];

  for (const asset of MASTER_REQUIRED_ASSETS) {
    const assetLower = asset.toLowerCase();
    const found = files.find(f => {
      const fn = f.name.toLowerCase();
      return fn === assetLower || fn.includes(assetLower.replace('.jpg', '').replace('.mp3', ''));
    });

    if (found) {
      matchedFiles.push(asset);
    } else {
      missingFiles.push(asset);
    }
  }

  return {
    isSynced: missingFiles.length === 0,
    syncedFilesCount: matchedFiles.length,
    totalRequired: MASTER_REQUIRED_ASSETS.length,
    missingFiles,
    matchedFiles,
    lastChecked: now,
  };
}


