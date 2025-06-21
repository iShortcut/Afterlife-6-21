import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Profile } from '../../types'; // וודא שסוג ה-Profile תואם את הטבלה שלך
import Button from '../ui/Button';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import ImageUpload from '../ui/ImageUpload';
import { UploadCloud } from 'lucide-react'; // Example, replace with actual icon if needed
import Select from '../ui/Select'; // וודא ש-Select קיים
import toast from 'react-hot-toast'; // Add missing toast - import

// עדכון Type עבור ProfileFormData כדי לשקף את העמודות שלך
// Omit כל העמודות שמנוהלות אוטומטית או לא על ידי הטופס
// לוודא ש-visibility הוא מ-z.enum
type ProfileFormData = {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    bio: string | null;
    visibility: 'public' | 'private' | 'friends_only'; // השתמש ב-enum שהוגדר ב-DB
    cover_image_url: string | null;
    birth_date: string | null; // פורמט yyyy-MM-DD
    location: string | null;
    phone_number: string | null;
    website: string | null;
    external_links: Array<{ type: string; url: string }> | null;
    // הוסף כאן כל שדה אחר שאתה רוצה לנהל בטופס
};

const ProfileForm: React.FC = () => {
    const { user, profile: contextProfile, setProfile: setContextProfile, refreshUser } = useAuth();
    const [formData, setFormData] = useState<ProfileFormData>({
        full_name: null,
        username: null,
        avatar_url: null,
        bio: null,
        visibility: 'public',
        cover_image_url: null,
        birth_date: null,
        location: null,
        phone_number: null,
        website: null,
        external_links: null,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);

    const fetchProfile = useCallback(async () => {
        if (!user || !user.id) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        console.log(`ProfileForm: Fetching profile for user ID: ${user.id}`);
        try {
            const { data, error: fetchError } = await supabase
                .from('profiles')
                .select('full_name, username, avatar_url, bio, visibility, cover_image_url, birth_date, location, phone_number, website, external_links')
                .eq('id', user.id)
                .maybeSingle(); // *** תיקון: שימוש ב-maybeSingle לטעינה ***

            if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows found" expected behavior for maybeSingle
                throw fetchError;
            }

            if (data) {
                console.log('ProfileForm: Profile data fetched:', data);
                // וודא ש-external_links הוא תמיד מערך
                const sanitizedData: ProfileFormData = {
                    ...data,
                    external_links: Array.isArray(data.external_links) ? data.external_links : [],
                    birth_date: data.birth_date ? new Date(data.birth_date).toISOString().split('T')[0] : null, // פורמט תאריך ל-input type="date"
                    visibility: data.visibility || 'public' // לוודא ערך ברירת מחדל
                };
                setFormData(sanitizedData);
                setAvatarPreview(data.avatar_url || null);
                setCoverPreview(data.cover_image_url || null);
                if (setContextProfile) setContextProfile(data as Profile); // עדכן את הקונטקסט
            } else {
                console.log('ProfileForm: No profile data found for user, initializing form with user metadata.');
                // אם הפרופיל לא קיים, אתחל מ-user_metadata (אם קיים)
                setFormData({
                    full_name: user.user_metadata?.full_name || null,
                    username: user.user_metadata?.username || null,
                    avatar_url: user.user_metadata?.avatar_url || null,
                    bio: null,
                    visibility: 'public',
                    cover_image_url: user.user_metadata?.cover_image_url || null,
                    birth_date: null,
                    location: null,
                    phone_number: null,
                    website: null,
                    external_links: [],
                });
                setAvatarPreview(user.user_metadata?.avatar_url || null);
                setCoverPreview(user.user_metadata?.cover_image_url || null);
                if (setContextProfile) setContextProfile(null); // נקה את הקונטקסט אם אין פרופיל
                toast('No profile found. Please fill out your details.', { duration: 5000 });
            }
        } catch (err: any) {
            console.error('ProfileForm: Error fetching profile:', err);
            setError(err.message || 'Failed to load profile data.');
        } finally {
            setLoading(false);
        }
    }, [user, setContextProfile]);

    useEffect(() => {
        if (user) {
            fetchProfile();
        } else {
            setLoading(false);
        }
    }, [user, fetchProfile]);

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleExternalLinkChange = (index: number, field: 'type' | 'url', value: string) => {
        const newLinks = [...(formData.external_links || [])];
        if (newLinks[index]) {
            newLinks[index] = { ...newLinks[index], [field]: value };
            setFormData(prev => ({ ...prev, external_links: newLinks }));
        }
    };

    const addExternalLink = () => {
        setFormData(prev => ({
            ...prev,
            external_links: [...(prev.external_links || []), { type: '', url: '' }],
        }));
    };

    const removeExternalLink = (index: number) => {
        setFormData(prev => ({
            ...prev,
            external_links: (prev.external_links || []).filter((_, i) => i !== index),
        }));
    };

    const handleAvatarSelected = (file: File | null) => {
        setAvatarFile(file);
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setAvatarPreview(formData.avatar_url || null);
        }
    };

    const handleCoverSelected = (file: File | null) => {
        setCoverFile(file);
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCoverPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setCoverPreview(formData.cover_image_url || null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // English comment for code standard
        // Add a guard clause to prevent update attempts with a null user object.
        if (!user || !user.id) {
          console.error('ProfileForm.tsx - handleSubmit failed: User object or user.id is null/undefined at the time of submission.');
          alert('An authentication error occurred. Please try logging out and logging back in.');
          setSaving(false); // Ensure loading state is reset
          return; // Stop the function execution
        }
        // Log the user ID being used for the update for debugging purposes.
        console.log(`ProfileForm.tsx - Attempting to update profile for user ID: ${user.id}`);


        setSaving(true);
        setError(null);
        setSuccessMessage(null);

        let new_avatar_url = formData.avatar_url;
        let new_cover_image_url = formData.cover_image_url;
        let userMetadataUpdate: { avatar_url?: string, cover_image_url?: string, full_name?: string, username?: string } = {};


        try {
            // Handle avatar upload
            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop();
                const fileName = `avatar-${Date.now()}.${fileExt}`;
                const filePath = `avatars/${user.id}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('media')
                    .upload(filePath, avatarFile, { upsert: true });

                if (uploadError) throw new Error(`Avatar upload failed: ${uploadError.message}`);
                const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(filePath);
                new_avatar_url = publicUrlData.publicUrl;
                userMetadataUpdate.avatar_url = new_avatar_url;
            }

            // Handle cover image upload
            if (coverFile) {
                const fileExt = coverFile.name.split('.').pop();
                const fileName = `cover-${Date.now()}.${fileExt}`;
                const filePath = `covers/${user.id}/${fileName}`; // Using the 'covers' folder inside 'media' bucket

                const { error: uploadError } = await supabase.storage
                    .from('media')
                    .upload(filePath, coverFile, { upsert: true });

                if (uploadError) throw new Error(`Cover image upload failed: ${uploadError.message}`);
                const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(filePath);
                new_cover_image_url = publicUrlData.publicUrl;
                userMetadataUpdate.cover_image_url = new_cover_image_url;
            }

            // Prepare data for 'profiles' table - include the user ID for upsert
            const profileUpdateData = {
                id: user.id, // Include the user ID for upsert
                full_name: formData.full_name || null,
                username: formData.username || null,
                avatar_url: new_avatar_url,
                cover_image_url: new_cover_image_url,
                bio: formData.bio || null,
                visibility: formData.visibility || 'public',
                birth_date: formData.birth_date || null,
                location: formData.location || null,
                phone_number: formData.phone_number || null,
                website: formData.website || null,
                external_links: formData.external_links && formData.external_links.length > 0 ? formData.external_links : null,
                updated_at: new Date().toISOString(), // עדכן updated_at
            };

            // Use upsert instead of update to handle cases where profile doesn't exist
            const { data: updatedProfile, error: updateProfileError } = await supabase
                .from('profiles')
                .upsert(profileUpdateData, {
                    onConflict: 'id',
                    ignoreDuplicates: false
                })
                .select()
                .maybeSingle(); // *** תיקון: שימוש ב-maybeSingle גם בעדכון ***

            if (updateProfileError) throw updateProfileError;

            if (updatedProfile) {
                setSuccessMessage('Profile updated successfully!');
                setFormData(updatedProfile as ProfileFormData); // עדכן את מצב הטופס עם הנתונים המעודכנים
                if (setContextProfile) setContextProfile(updatedProfile as Profile); // עדכן את הקונטקסט

                // Update auth.users.user_metadata if names changed
                if (formData.full_name && user.user_metadata?.full_name !== formData.full_name) {
                    userMetadataUpdate.full_name = formData.full_name;
                }
                if (formData.username && user.user_metadata?.username !== formData.username) {
                    userMetadataUpdate.username = formData.username; // אם יש עמודת username ב-user_metadata
                }


                if (Object.keys(userMetadataUpdate).length > 0) {
                    const { error: updateUserMetaError } = await supabase.auth.updateUser({
                        data: userMetadataUpdate
                    });
                    if (updateUserMetaError) console.error("Error updating user metadata:", updateUserMetaError);
                }
                if (refreshUser) await refreshUser(); // Refresh auth context user
            } else {
                // אם maybeSingle החזיר null (לא בוצע עדכון)
                setSuccessMessage('Profile is up to date.');
            }


        } catch (err: any) {
            console.error("ProfileForm: Error in handleSubmit:", err);
            setError(err.message || 'An error occurred.');
        } finally {
            setSaving(false);
        }
    };

    // JSX
    return (
        <form onSubmit={handleSubmit} className="space-y-6 p-4 md:p-6 bg-white dark:bg-slate-800 shadow-md rounded-lg">
            {error && <div className="text-red-600 dark:text-red-400 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 rounded-md text-sm">{error}</div>}
            {successMessage && <div className="text-green-700 dark:text-green-300 p-3 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600 rounded-md text-sm">{successMessage}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="full_name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                    <Input
                        type="text"
                        name="full_name"
                        id="full_name"
                        value={formData.full_name || ''}
                        onChange={handleInputChange}
                        className="dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600"
                    />
                </div>

                <div>
                    <label htmlFor="username" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Username</label>
                    <Input
                        type="text"
                        name="username"
                        id="username"
                        value={formData.username || ''}
                        onChange={handleInputChange}
                        className="dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600"
                        aria-describedby="username-description"
                    />
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400" id="username-description">
                        Unique username.
                    </p>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Avatar</label>
                <ImageUpload
                    onImageChange={handleAvatarSelected}
                    currentImageUrl={avatarPreview}
                    label="Upload new avatar (max 2MB, JPG/PNG)"
                    aspectRatio="aspect-square"
                    fileTypes={['image/jpeg', 'image/png']}
                    maxFileSizeMB={2}
                    imageClassName="rounded-full w-32 h-32 object-cover"
                    labelClassName="text-xs"
                    bucket="media" // Bucket for avatars and covers
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cover Image</label>
                <ImageUpload
                    onImageChange={handleCoverSelected}
                    currentImageUrl={coverPreview}
                    label="Upload new cover image (820x360, max 5MB, JPG/PNG)"
                    aspectRatio="aspect-[820/360]"
                    fileTypes={['image/jpeg', 'image/png']}
                    maxFileSizeMB={5}
                    labelClassName="text-xs"
                    bucket="media" // Bucket for avatars and covers
                />
            </div>

            <div>
                <label htmlFor="bio" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bio</label>
                <TextArea
                    name="bio"
                    id="bio"
                    value={formData.bio || ''}
                    onChange={handleInputChange}
                    rows={4}
                    className="dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="birth_date" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Birth Date</label>
                    <Input
                        type="date"
                        name="birth_date"
                        id="birth_date"
                        value={formData.birth_date || ''}
                        onChange={handleInputChange}
                        className="dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 dark:[color-scheme:dark]"
                    />
                </div>
                <div>
                    <label htmlFor="location" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Location</label>
                    <Input
                        type="text"
                        name="location"
                        id="location"
                        value={formData.location || ''}
                        onChange={handleInputChange}
                        className="dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="phone_number" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                    <Input
                        type="tel"
                        name="phone_number"
                        id="phone_number"
                        value={formData.phone_number || ''}
                        onChange={handleInputChange}
                        className="dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600"
                    />
                </div>
                <div>
                    <label htmlFor="website" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Website</label>
                    <Input
                        type="url"
                        name="website"
                        id="website"
                        placeholder="https://example.com"
                        value={formData.website || ''}
                        onChange={handleInputChange}
                        className="dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">External Links</label>
                {(formData.external_links || []).map((link, index) => (
                    <div key={index} className="flex items-center gap-2 mb-2">
                        <Input
                            type="text"
                            placeholder="Link Type (e.g., Facebook)"
                            value={link.type}
                            onChange={(e) => handleExternalLinkChange(index, 'type', e.target.value)}
                            className="flex-1 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600"
                        />
                        <Input
                            type="url"
                            placeholder="URL (e.g., https://facebook.com/username)"
                            value={link.url}
                            onChange={(e) => handleExternalLinkChange(index, 'url', e.target.value)}
                            className="flex-1 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600"
                        />
                        <Button type="button" variant="danger-outline" size="sm" onClick={() => removeExternalLink(index)}>Remove</Button>
                    </div>
                ))}
                <Button type="button" variant="secondary" size="sm" onClick={addExternalLink}>Add External Link</Button>
            </div>


            <div>
                <label htmlFor="visibility" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Profile Visibility</label>
                <select
                    name="visibility"
                    id="visibility"
                    value={formData.visibility || 'public'}
                    onChange={handleInputChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                    <option value="public">Public</option>
                    <option value="friends_only">Friends Only</option>
                    <option value="private">Private</option>
                </select>
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" variant="primary" disabled={saving || loading}>
                    {saving ? 'Saving...' : 'Save Profile'}
                </Button>
            </div>
        </form>
    );
};

export default ProfileForm;