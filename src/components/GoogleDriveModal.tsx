/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * GOOGLE DRIVE WORKSPACE MODAL
 * Allows users and administrators to connect Google Drive, browse Drive files,
 * save Nessa brand assets directly to a 'Luckyly Brand Assets' folder, and sync media.
 */

import React, { useState, useEffect } from 'react';
import { X, HardDrive, Upload, RefreshCw, CheckCircle, ExternalLink, FolderPlus, AlertCircle, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  isDriveConnected,
  listDriveFiles,
  backupAllNessaAssetsToDrive,
  verifyDriveAssetsSync,
  DriveSyncStatus,
  MASTER_REQUIRED_ASSETS,
  GoogleDriveFile,
  uploadTextDocumentToDrive,
} from '../services/googleDriveService.ts';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({ isOpen, onClose }) => {
  const { user, signInWithGoogle } = useAuth();

  const [connected, setConnected] = useState<boolean>(false);
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Backup & sync status
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);
  const [backupSuccessMessage, setBackupSuccessMessage] = useState<string | null>(null);

  // Master Reference Synchronization Status
  const [syncStatus, setSyncStatus] = useState<DriveSyncStatus | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const status = await verifyDriveAssetsSync();
      setSyncStatus(status);
    } catch (err) {
      console.warn('Sync verification check failed:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  const checkConnectionAndLoad = async () => {
    const isConn = isDriveConnected();
    setConnected(isConn);
    if (isConn) {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await listDriveFiles();
      setIsLoading(false);
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setFiles(res.files);
      }
      // Run sync verification
      await handleVerify();
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkConnectionAndLoad();
      setBackupSuccessMessage(null);
      setSyncProgress(null);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleConnect = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await signInWithGoogle();
      setTimeout(async () => {
        await checkConnectionAndLoad();
      }, 500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to connect Google Drive.');
    } finally {
      setIsLoading(false);
    }
  };

  const [isSavingArtifact, setIsSavingArtifact] = useState<boolean>(false);
  const [createdDriveFile, setCreatedDriveFile] = useState<GoogleDriveFile | null>(null);

  const handleSaveArtifact = async () => {
    setIsSavingArtifact(true);
    setBackupSuccessMessage(null);
    setErrorMessage(null);
    setCreatedDriveFile(null);

    try {
      if (!isDriveConnected()) {
        await signInWithGoogle();
        await new Promise(r => setTimeout(r, 600));
      }

      const res = await fetch('/docs/Luckyly_Google_Drive_Code_Sync_Agent_Plan.md');
      const content = await res.text();
      const uploadRes = await uploadTextDocumentToDrive({
        filename: 'Luckyly_Google_Drive_Code_Sync_Agent_Plan.md',
        content,
        mimeType: 'text/markdown',
      });

      if (uploadRes.success && uploadRes.file) {
        setCreatedDriveFile(uploadRes.file);
        setBackupSuccessMessage(`Successfully created "Luckyly_Google_Drive_Code_Sync_Agent_Plan.md" directly in your Google Drive!`);
        const refreshed = await listDriveFiles();
        if (refreshed.files) setFiles(refreshed.files);
      } else {
        setErrorMessage(uploadRes.error || 'Failed to create file in Google Drive. Please authorize access.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error creating file in Google Drive.');
    } finally {
      setIsSavingArtifact(false);
    }
  };

  const handleBackupNessaAssets = async () => {
    setIsBackingUp(true);
    setBackupSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await backupAllNessaAssetsToDrive((curr, tot, name) => {
        setSyncProgress(`Uploading ${name} (${curr}/${tot})...`);
      });

      if (res.success) {
        setBackupSuccessMessage(`Successfully saved assets to your Google Drive in "Luckyly Brand Assets"!`);
        const refreshed = await listDriveFiles();
        if (refreshed.files) setFiles(refreshed.files);
        await handleVerify();
      } else {
        setErrorMessage(res.error || 'Failed to save assets to Drive.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred during Drive backup.');
    } finally {
      setIsBackingUp(false);
      setSyncProgress(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drive-modal-title"
    >
      <div className="relative w-full max-w-xl bg-neutral-950 border border-amber-500/40 rounded-2xl shadow-2xl shadow-amber-950/40 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-800 bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300">
              <HardDrive size={20} />
            </div>
            <div>
              <h2 id="drive-modal-title" className="text-base font-serif font-bold text-amber-200">
                Google Drive Integration
              </h2>
              <p className="text-xs text-neutral-400">
                Sync, store, and manage Luckyly media and Nessa assets directly in your Drive.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm text-neutral-300">
          {/* Prominent Artifact Document Card: Luckyly_Google_Drive_Code_Sync_Agent_Plan.md */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5 border border-amber-500/40 shadow-lg shadow-amber-950/20 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0 mt-0.5">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold uppercase">
                      Ready to Upload
                    </span>
                    <span className="text-[11px] text-neutral-400">2.9 KB</span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-1 break-all">
                    Luckyly_Google_Drive_Code_Sync_Agent_Plan.md
                  </h4>
                  <p className="text-xs text-neutral-300 mt-0.5">
                    Implementation plan for the Google Drive Code Sync Agent.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-500/20">
              <button
                onClick={handleSaveArtifact}
                disabled={isSavingArtifact}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-amber-950/30 cursor-pointer"
              >
                {isSavingArtifact ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Creating in Google Drive...</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    <span>Create File in Google Drive Now</span>
                  </>
                )}
              </button>

              {createdDriveFile?.webViewLink && (
                <a
                  href={createdDriveFile.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center gap-1.5 transition-all"
                >
                  <ExternalLink size={13} />
                  <span>Open File in Google Drive</span>
                </a>
              )}
            </div>
          </div>

          {backupSuccessMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle size={14} className="shrink-0" />
              <span>{backupSuccessMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!connected ? (
            /* Connect Prompt */
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg">
                <HardDrive size={32} />
              </div>
              <div className="space-y-1.5 max-w-sm mx-auto">
                <h3 className="text-base font-semibold text-white">Connect Your Google Drive</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Sign in with your Google account to browse Drive files, save Nessa mascot artwork, and sync brand assets seamlessly.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 max-w-sm mx-auto flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-amber-950/40 inline-flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <HardDrive size={14} />
                    <span>Authorize Google Drive</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Connected Workspace Panel */
            <div className="space-y-4">
              {/* Actions Bar */}
              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                  <CheckCircle size={14} />
                  <span>Drive Connected ({user?.email || 'Active Account'})</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={checkConnectionAndLoad}
                    disabled={isLoading}
                    title="Refresh files"
                    className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                  >
                    <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                  </button>

                  <button
                    onClick={handleBackupNessaAssets}
                    disabled={isBackingUp}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    {isBackingUp ? (
                      <>
                        <RefreshCw size={12} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <FolderPlus size={13} />
                        <span>Save Nessa Assets to Drive</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Master Reference Synchronization Status Indicator Card */}
              <div className="p-3.5 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        syncStatus?.isSynced ? 'bg-emerald-400' : 'bg-amber-400'
                      }`} />
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                        syncStatus?.isSynced ? 'bg-emerald-500' : 'bg-amber-500'
                      }`} />
                    </span>
                    <span className="text-xs font-semibold text-neutral-200">
                      {syncStatus?.isSynced
                        ? 'Master Reference Sync Active (6/6 Verified)'
                        : `Synchronization Status: ${syncStatus?.syncedFilesCount || 0} / 6 Master Assets in Drive`}
                    </span>
                  </div>

                  <button
                    onClick={handleVerify}
                    disabled={isVerifying}
                    className="text-[11px] text-neutral-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw size={11} className={isVerifying ? 'animate-spin' : ''} />
                    <span>{isVerifying ? 'Verifying...' : 'Verify Sync'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1 text-[11px]">
                  {MASTER_REQUIRED_ASSETS.map((asset, idx) => {
                    const isMatched = syncStatus?.matchedFiles?.includes(asset);
                    const shortName = asset.replace('Nessa_Voice_', '').replace('.mp3', '').replace('.jpg', '');
                    return (
                      <div
                        key={idx}
                        className={`px-2 py-1.5 rounded-lg border flex items-center justify-between gap-1.5 ${
                          isMatched
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-medium'
                            : 'bg-neutral-800/40 border-neutral-800 text-neutral-400'
                        }`}
                      >
                        <span className="truncate">{shortName}</span>
                        {isMatched ? (
                          <CheckCircle size={11} className="text-emerald-400 shrink-0" />
                        ) : (
                          <span className="text-[10px] text-neutral-400">pending</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {syncProgress && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2 animate-pulse">
                  <RefreshCw size={14} className="animate-spin shrink-0" />
                  <span>{syncProgress}</span>
                </div>
              )}

              {backupSuccessMessage && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle size={14} className="shrink-0" />
                  <span>{backupSuccessMessage}</span>
                </div>
              )}

              {errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Files List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
                  <span>Your Google Drive Files ({files.length})</span>
                  <span>Recent</span>
                </div>

                {isLoading ? (
                  <div className="py-12 text-center text-neutral-400 text-xs flex flex-col items-center gap-2">
                    <RefreshCw size={18} className="animate-spin text-amber-400" />
                    <span>Loading Drive files...</span>
                  </div>
                ) : files.length === 0 ? (
                  <div className="p-8 rounded-xl bg-neutral-900/40 border border-dashed border-neutral-800 text-center space-y-2">
                    <FileText size={24} className="mx-auto text-neutral-600" />
                    <p className="text-xs text-neutral-400">No matching image or brand files found in Drive.</p>
                    <button
                      onClick={handleBackupNessaAssets}
                      className="text-xs text-amber-400 hover:underline"
                    >
                      Click here to save Nessa brand assets into your Drive
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-800/80 max-h-64 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-900/60">
                    {files.map(file => (
                      <div
                        key={file.id}
                        className="p-3 flex items-center justify-between gap-3 hover:bg-neutral-800/50 transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {file.thumbnailLink ? (
                            <img
                              src={file.thumbnailLink}
                              alt=""
                              className="w-8 h-8 rounded object-cover border border-neutral-700 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded bg-neutral-800 flex items-center justify-center text-neutral-400 shrink-0">
                              <FileText size={14} />
                            </div>
                          )}
                          <div className="truncate">
                            <p className="text-white font-medium truncate">{file.name}</p>
                            <p className="text-[10px] text-neutral-400 truncate">{file.mimeType}</p>
                          </div>
                        </div>

                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-neutral-400 hover:text-amber-300 rounded hover:bg-neutral-800 shrink-0"
                            title="Open in Google Drive"
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default GoogleDriveModal;
