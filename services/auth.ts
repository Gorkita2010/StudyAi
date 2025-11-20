
import { User, UserProfile, FailedQuestion, ExamQuestion } from "../types";
import { GOOGLE_CLIENT_ID } from "../config";
import { detectBrowserLanguage } from "../utils/translations";

const USER_KEY = 'studyAi_currentUser';
const PROFILE_PREFIX = 'studyAi_profile_';
const ADMIN_EMAIL = 'jorgeyelectricidad@gmail.com';
const LIMIT_FREE = 20;
const LIMIT_PRO = 200;

declare var google: any;

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
        const users = getUsersDB();
        const user = users.find(u => u.email === email);
        if (!user) throw new Error("Invalid credentials.");
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        return user;
    },

    loginWithGoogle: (): Promise<User> => {
        return new Promise((resolve, reject) => {
            if (typeof google === 'undefined') {
                reject("Google Services not loaded");
                return;
            }

            const client = google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/drive.file',
                callback: async (tokenResponse: any) => {
                    if (tokenResponse.error) {
                        reject(tokenResponse);
                        return;
                    }

                    try {
                        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                            headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                        });
                        
                        const userInfo = await userInfoRes.json();
                        
                        const googleUser: User = {
                            id: userInfo.sub,
                            name: userInfo.name,
                            email: userInfo.email,
                            avatar: userInfo.picture || '🎓'
                        };

                        saveUserToDB(googleUser);
                        localStorage.setItem(USER_KEY, JSON.stringify(googleUser));
                        resolve(googleUser);

                    } catch (err) {
                        reject(err);
                    }
                },
            });
            client.requestAccessToken();
        });
    },

    logout: () => {
        localStorage.removeItem(USER_KEY);
    },

    getUserProfile: (userId: string): UserProfile => {
        const json = localStorage.getItem(PROFILE_PREFIX + userId);
        if (json) return JSON.parse(json);
        return {
            userId,
            savedSyllabus: '',
            lastLanguage: detectBrowserLanguage(),
            totalScore: 0,
            topicStats: {},
            isPro: false,
            failedQuestions: [],
            learnedFlashcards: [],
            dailyUsage: 0,
            lastUsageDate: new Date().toISOString().split('T')[0]
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

    // Usage Limiting
    checkUsageLimit: (userId: string): boolean => {
        const user = AuthService.getCurrentUser();
        // ADMIN BYPASS
        if (user && user.email === ADMIN_EMAIL) return true;

        const profile = AuthService.getUserProfile(userId);
        const today = new Date().toISOString().split('T')[0];
        
        // Reset if new day
        if (profile.lastUsageDate !== today) {
            profile.dailyUsage = 0;
            profile.lastUsageDate = today;
            AuthService.saveUserProfile(profile);
            return true;
        }

        const limit = profile.isPro ? LIMIT_PRO : LIMIT_FREE;
        return (profile.dailyUsage || 0) < limit;
    },

    incrementUsage: (userId: string) => {
        const profile = AuthService.getUserProfile(userId);
        if (!profile.dailyUsage) profile.dailyUsage = 0;
        profile.dailyUsage += 1;
        AuthService.saveUserProfile(profile);
    },

    // Failed Questions Management
    saveFailedQuestion: (userId: string, question: ExamQuestion) => {
        const profile = AuthService.getUserProfile(userId);
        if (!profile.failedQuestions) profile.failedQuestions = [];
        
        // Avoid duplicates
        const exists = profile.failedQuestions.some(fq => fq.question.question === question.question);
        if (!exists) {
            profile.failedQuestions.push({
                question,
                timestamp: Date.now()
            });
            AuthService.saveUserProfile(profile);
        }
    },

    getFailedQuestions: (userId: string): ExamQuestion[] => {
        const profile = AuthService.getUserProfile(userId);
        return profile.failedQuestions ? profile.failedQuestions.map(fq => fq.question) : [];
    },

    // Flashcards Management
    markFlashcardLearned: (userId: string, frontText: string) => {
        const profile = AuthService.getUserProfile(userId);
        if (!profile.learnedFlashcards) profile.learnedFlashcards = [];
        if (!profile.learnedFlashcards.includes(frontText)) {
            profile.learnedFlashcards.push(frontText);
            AuthService.saveUserProfile(profile);
        }
    },

    getLearnedFlashcards: (userId: string): string[] => {
        const profile = AuthService.getUserProfile(userId);
        return profile.learnedFlashcards || [];
    },

    resetFlashcards: (userId: string) => {
        const profile = AuthService.getUserProfile(userId);
        profile.learnedFlashcards = [];
        AuthService.saveUserProfile(profile);
    },

    clearUserStudyData: (userId: string) => {
        const profile = AuthService.getUserProfile(userId);
        profile.savedSyllabus = '';
        profile.topicStats = {};
        profile.totalScore = 0;
        profile.failedQuestions = [];
        profile.learnedFlashcards = [];
        AuthService.saveUserProfile(profile);
    },
    
    setProStatus: (userId: string, isPro: boolean) => {
        const profile = AuthService.getUserProfile(userId);
        profile.isPro = isPro;
        AuthService.saveUserProfile(profile);
    }
};