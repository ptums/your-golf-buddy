import { openDB, DBSchema, IDBPDatabase } from "idb";

export interface Profile {
  id: string;
  username: string;
  dobHash: string; // Hashed date of birth
  createdAt: string;
  lastActiveAt: string;
}

export interface CreateProfileData {
  username: string;
  dob: string; // Date string in YYYY-MM-DD format
}

export interface ProfileDB extends DBSchema {
  profiles: {
    key: string;
    value: Profile;
    indexes: {
      "by-username": string;
      "by-created": string;
    };
  };
}

class ProfileDatabase {
  private db: IDBPDatabase<ProfileDB> | null = null;
  private readonly DB_NAME = "GolfBuddyProfiles";
  private readonly DB_VERSION = 1;

  async init(): Promise<void> {
    if (typeof window === "undefined") return;

    try {
      this.db = await openDB<ProfileDB>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          // Create profiles store
          const profileStore = db.createObjectStore("profiles", {
            keyPath: "id",
          });

          // Create indexes
          profileStore.createIndex("by-username", "username", { unique: true });
          profileStore.createIndex("by-created", "createdAt");

          console.log("Profile database upgraded successfully");
        },
      });
      console.log("Profile database initialized successfully");
    } catch (error) {
      console.error("Failed to initialize profile database:", error);
      throw error;
    }
  }

  private async ensureDB(): Promise<IDBPDatabase<ProfileDB>> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error("Database not available");
    }
    return this.db;
  }

  private async hashDOB(dob: string): Promise<string> {
    // Simple hash for demo - in production use a proper hashing library
    const encoder = new TextEncoder();
    const data = encoder.encode(dob + "GOLF_BUDDY_SALT");
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  private async verifyDOB(dob: string, hash: string): Promise<boolean> {
    const computedHash = await this.hashDOB(dob);
    return computedHash === hash;
  }

  async createProfile(profileData: CreateProfileData): Promise<Profile> {
    const db = await this.ensureDB();

    // Check if username already exists
    const existingProfile = await db.getFromIndex(
      "profiles",
      "by-username",
      profileData.username
    );
    if (existingProfile) {
      throw new Error("Username already exists");
    }

    // Hash the DOB
    const dobHash = await this.hashDOB(profileData.dob);

    const profile: Profile = {
      id: crypto.randomUUID(),
      username: profileData.username,
      dobHash,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };

    try {
      await db.add("profiles", profile);
      return profile;
    } catch (error) {
      console.error("Failed to create profile:", error);
      throw new Error("Failed to create profile");
    }
  }

  async getProfileById(id: string): Promise<Profile | null> {
    const db = await this.ensureDB();
    try {
      const profile = await db.get("profiles", id);
      return profile ?? null;
    } catch (error) {
      console.error("Failed to get profile:", error);
      return null;
    }
  }

  async getProfileByUsername(username: string): Promise<Profile | null> {
    const db = await this.ensureDB();
    try {
      const profile = await db.getFromIndex(
        "profiles",
        "by-username",
        username
      );
      return profile ?? null;
    } catch (error) {
      console.error("Failed to get profile by username:", error);
      return null;
    }
  }

  async updateProfile(
    id: string,
    updates: Partial<Omit<Profile, "id" | "dobHash">>
  ): Promise<Profile> {
    const db = await this.ensureDB();

    const profile = await this.getProfileById(id);
    if (!profile) {
      throw new Error("Profile not found");
    }

    const updatedProfile = {
      ...profile,
      ...updates,
      lastActiveAt: new Date().toISOString(),
    };

    try {
      await db.put("profiles", updatedProfile);
      return updatedProfile;
    } catch (error) {
      console.error("Failed to update profile:", error);
      throw new Error("Failed to update profile");
    }
  }

  async updateLastActive(id: string): Promise<void> {
    await this.updateProfile(id, { lastActiveAt: new Date().toISOString() });
  }

  async getAllProfiles(): Promise<Profile[]> {
    const db = await this.ensureDB();
    try {
      return await db.getAll("profiles");
    } catch (error) {
      console.error("Failed to get all profiles:", error);
      return [];
    }
  }

  async getProfileCount(): Promise<number> {
    const db = await this.ensureDB();
    try {
      return await db.count("profiles");
    } catch (error) {
      console.error("Failed to get profile count:", error);
      return 0;
    }
  }

  async deleteProfile(id: string): Promise<void> {
    const db = await this.ensureDB();
    try {
      await db.delete("profiles", id);
    } catch (error) {
      console.error("Failed to delete profile:", error);
      throw new Error("Failed to delete profile");
    }
  }

  // Utility method to verify DOB (for profile updates, etc.)
  async verifyProfileDOB(profileId: string, dob: string): Promise<boolean> {
    const profile = await this.getProfileById(profileId);
    if (!profile) return false;
    return this.verifyDOB(dob, profile.dobHash);
  }

  // Clear all data (for testing/reset)
  async clearDatabase(): Promise<void> {
    const db = await this.ensureDB();
    try {
      await db.clear("profiles");
    } catch (error) {
      console.error("Failed to clear database:", error);
      throw new Error("Failed to clear database");
    }
  }
}

// Export singleton instance only in browser environment
export const profileDB =
  typeof window !== "undefined"
    ? new ProfileDatabase()
    : (null as ProfileDatabase | null);

// Initialize database only in browser environment
if (typeof window !== "undefined" && profileDB) {
  profileDB.init().catch(console.error);
}
