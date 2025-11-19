
import { GOOGLE_CLIENT_ID } from "../config";

// Service for Google Drive Integration
declare var google: any;

const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient: any;
let accessToken: string | null = null;

export const GoogleDriveService = {
    init: (callback?: (token: string) => void) => {
        if (typeof google === 'undefined') return;
        
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: SCOPES,
            callback: (response: any) => {
                if (response.error !== undefined) {
                    throw (response);
                }
                accessToken = response.access_token;
                if(callback) callback(accessToken!);
            },
        });
    },

    // Triggers the Google Login Popup for Drive Scope
    loginAndGetToken: (): Promise<string> => {
        return new Promise((resolve, reject) => {
            if (!tokenClient) {
                try {
                    GoogleDriveService.init((token) => resolve(token));
                } catch(e) {
                    reject("Google Scripts not loaded. Check internet connection.");
                    return;
                }
            }
            
            // Override the callback for this specific request if needed
            if (tokenClient) {
                tokenClient.callback = (resp: any) => {
                    if (resp.error) reject(resp);
                    accessToken = resp.access_token;
                    resolve(accessToken!);
                };
            }

            // Trigger popup
            if (typeof google !== 'undefined' && google && tokenClient) {
                tokenClient.requestAccessToken({ prompt: 'consent' });
            } else {
                reject("Google API not ready");
            }
        });
    },

    uploadFile: async (content: string | Blob, filename: string, mimeType: string): Promise<string> => {
        if (!accessToken) {
             await GoogleDriveService.loginAndGetToken();
        }

        const metadata = {
            name: filename,
            mimeType: mimeType,
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        
        let contentBlob: Blob;
        if (typeof content === 'string') {
            contentBlob = new Blob([content], { type: mimeType });
        } else {
            contentBlob = content;
        }
        form.append('file', contentBlob);

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
            body: form,
        });

        if (!response.ok) {
            throw new Error('Drive Upload Failed');
        }
        
        const data = await response.json();
        return data.id; // Return File ID
    }
};
