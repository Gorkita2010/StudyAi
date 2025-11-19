
import { User, UserProfile } from "../types";
import { GOOGLE_CLIENT_ID } from "../config";

const USER_KEY = 'studyAi_currentUser';
const PROFILE_PREFIX = 'studyAi_profile_';

declare var google: any;

// We use a simple localStorage strategy for the "database" of manual users
// But for Google users, we verify against the actual Google User Info API
const getUsersDB = (): User[] => {
    const json = localStorage.getItem('studyAi_usersDB');
    return json ? JSON.parse(json) : [];
}

const saveUserToDB = (user: User) => {
    const users = getUsersDB();
    if (!users.find(u => u.id === user.id)) {
        users.push(user);
        localStorage.setItem('studyAi_usersDB', JSON.stringify(users));
    }
}

export const AuthService = {
    getCurrentUser: (): User | null => {
        const json = localStorage.getItem(USER_KEY);
        return json ? JSON.parse(json) : null;
    },

    register: async (name: string, email: string): Promise<User> => {
        // Manual registration still uses local simulation
        const users = getUsersDB();
        if (users.find(u => u.email === email)) {
            throw new Error("User already exists");
        }
        const newUser: User = {
            id: 'user_' + Date.now(),
            name,
            email,
            avatar: '👤'
        };
        saveUserToDB(newUser);
        localStorage.setItem(USER_KEY, JSON.stringify(newUser));
        return newUser;
    },

    login: async (email: string): Promise<User> => {
        // Manual login simulation
        const users = getUsersDB();
        const user = users.find(u => u.email === email);
        if (!user) throw new Error("Invalid credentials.");
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        return user;
    },

    // REAL GOOGLE LOGIN IMPLEMENTATION
    loginWithGoogle: (): Promise<User> => {
        return new Promise((resolve, reject) => {
            if (typeof google === 'undefined') {
                reject("Google Services not loaded");
                return;
            }

            // 1. Initialize Token Client (Implicit Flow)
            // We request 'drive.file' scope immediately so we can export later
            const client = google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/drive.file',
                callback: async (tokenResponse: any) => {
                    if (tokenResponse.error) {
                        reject(tokenResponse);
                        return;
                    }

                    // 2. Use the Access Token to get User Details
                    try {
                        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                            headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                        });
                        
                        const userInfo = await userInfoRes.json();
                        
                        // 3. Create User Object
                        const googleUser: User = {
                            id: userInfo.sub, // Google's unique ID
                            name: userInfo.name,
                            email: userInfo.email,
                            avatar: userInfo.picture || '🎓'
                        };

                        // 4. Persist
                        saveUserToDB(googleUser);
                        localStorage.setItem(USER_KEY, JSON.stringify(googleUser));
                        
                        // 5. Attempt to sync/restore profile from Drive (Bonus feature logic could go here)
                        // For now, we just return the user
                        resolve(googleUser);

                    } catch (err) {
                        reject(err);
                    }
                },
            });

            // 3. Trigger the popup
            client.requestAccessToken();
        });
    },

    logout: () => {
        localStorage.removeItem(USER_KEY);
        // Optionally revoke token here if stricter security needed
    },

    // Data Persistence
    getUserProfile: (userId: string): UserProfile => {
        const json = localStorage.getItem(PROFILE_PREFIX + userId);
        if (json) return JSON.parse(json);
        return {
            userId,
            savedSyllabus: '',
            lastLanguage: 'English',
            totalScore: 0,
            topicStats: {}
        };
    },

    saveUserProfile: (profile: UserProfile) => {
        localStorage.setItem(PROFILE_PREFIX + profile.userId, JSON.stringify(profile));
    },

    updateUserStats: (userId: string, topic: string, isCorrect: boolean) => {
        const profile = AuthService.getUserProfile(userId);
        if (!profile.topicStats) profile.topicStats = {};
        const normalizedTopic = topic.length > 20 ? topic.substring(0, 20) + "..." : topic;
        if (!profile.topicStats[normalizedTopic]) {
            profile.topicStats[normalizedTopic] = { correct: 0, total: 0 };
        }
        profile.topicStats[normalizedTopic].total += 1;
        if (isCorrect) profile.topicStats[normalizedTopic].correct += 1;
        AuthService.saveUserProfile(profile);
    },

    clearUserStudyData: (userId: string) => {
        const profile = AuthService.getUserProfile(userId);
        profile.savedSyllabus = '';
        profile.topicStats = {};
        profile.totalScore = 0;
        AuthService.saveUserProfile(profile);
    }
};
