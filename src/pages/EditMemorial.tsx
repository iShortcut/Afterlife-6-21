// 📁 src/pages/EditMemorial.tsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { MemorialFormData, Memorial } from '../types';
import Input from '../components/ui/Input';
import TextArea from '../components/ui/TextArea';
import Button from '../components/ui/Button';
import ImageUpload from '../components/ui/ImageUpload';
import toast from 'react-hot-toast';

const EditMemorial = () => {
  const { id: rawIdFromParams } = useParams<{ id: string }>(); // Renamed to avoid conflict
  const navigate = useNavigate();
  const { user } = useAuth();

  // Clean the ID immediately and store it in a state or a top-level const
  // Using a const here as it's derived once from params and shouldn't change for this instance
  const cleanedId = rawIdFromParams?.replace(/<[^>]*>/g, '');

  const [formData, setFormData] = useState<Partial<MemorialFormData>>({
    title: '',
    bio: '',
    birth_date: '',
    death_date: '',
    visibility: 'public',
    tier: 'free',
    org_id: null,
    profile_image_url: null,
    cover_image_url: null,
  });

  const [memorial, setMemorial] = useState<Memorial | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMemorialAndPermissions = async () => {
      if (!user || !cleanedId) { // Use cleanedId here
        setFetchLoading(false);
        if (!user) navigate('/login');
        else navigate('/dashboard');
        return;
      }

      try {
        setFetchLoading(true);
        setError(null);

        console.log(`[EditMemorial] Using cleaned ID for operations: '${cleanedId}'`);
        console.log(`[EditMemorial] Attempting RPC call for memorial_id: ${cleanedId}, user_id: ${user.id}`);
        const { data: canEditResult, error: rpcError } = await supabase.rpc('can_edit_memorial', {
          memorial_id: cleanedId, // Use cleanedId
          user_id: user.id
        });

        console.log('[EditMemorial] RPC call result - canEditResult:', canEditResult, 'rpcError:', rpcError);

        if (rpcError) {
          console.error('[EditMemorial] RPC error calling can_edit_memorial:', rpcError);
          toast.error(`Permission check failed: ${rpcError.message}`);
          navigate('/dashboard');
          return;
        }

        if (canEditResult !== true) {
          toast.error('You do not have permission to edit this memorial.');
          console.log(`[EditMemorial] No permission, canEditResult is ${canEditResult}. Navigating to dashboard.`);
          navigate('/dashboard');
          return;
        }

        console.log('[EditMemorial] User HAS permission. Proceeding to fetch memorial data.');

        const { data: memorialData, error: fetchError } = await supabase
          .from('memorials')
          .select('*')
          .eq('id', cleanedId) // Use cleanedId
          .single();

        console.log('[EditMemorial] Fetched memorial data:', memorialData);
        console.log('[EditMemorial] Fetch error for memorial data:', fetchError);

        if (fetchError) throw fetchError;

        if (memorialData) {
          console.log('[EditMemorial] Setting form data with memorialData:', memorialData);
          setMemorial(memorialData as Memorial);
          setFormData({
            title: memorialData.title,
            bio: memorialData.bio || '',
            birth_date: memorialData.birth_date || '',
            death_date: memorialData.death_date || '',
            visibility: memorialData.visibility || 'public',
            tier: memorialData.tier || 'free',
            org_id: memorialData.org_id || null,
            profile_image_url: memorialData.profile_image_url,
            cover_image_url: memorialData.cover_image_url,
          });
          console.log('[EditMemorial] formData was set.');
        } else {
            console.error(`[EditMemorial] Memorial data not found after permission check (ID: ${cleanedId}).`);
            toast.error("Memorial data not found. It might have been deleted or access is restricted.");
            navigate('/dashboard');
            return;
        }

      } catch (error: any) {
        console.error('[EditMemorial] Error in fetchMemorialAndPermissions:', error);
        toast.error(error.message || 'Failed to load memorial data.');
        navigate('/dashboard');
      } finally {
        setFetchLoading(false);
      }
    };

    if (cleanedId) { // Only fetch if cleaned ID is valid
        fetchMemorialAndPermissions();
    } else if (rawIdFromParams) { 
        console.error("[EditMemorial] Invalid memorial ID from URL params after cleaning:", rawIdFromParams);
        toast.error("Invalid memorial ID in URL.");
        navigate('/dashboard');
        setFetchLoading(false);
    }
  }, [cleanedId, rawIdFromParams, user, navigate]); // Use cleanedId and rawIdFromParams in dependencies

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !cleanedId) { // Use cleanedId
      setError('You must be logged in and have a valid memorial ID to edit.');
      toast.error('Authentication or Memorial ID missing.');
      return;
    }

    if (!formData.title || formData.title.trim() === '') {
      setError('Please provide a title for the memorial.');
      toast.error('Memorial title is required.');
      return;
    }

    setLoading(true);
    setError(null);
    toast.loading('Saving changes...');

    try {
      const updates: Partial<Memorial> = {
        title: formData.title,
        bio: formData.bio,
        birth_date: formData.birth_date || null,
        death_date: formData.death_date || null,
        visibility: formData.visibility,
        tier: formData.tier,
        org_id: formData.org_id,
      };

      let currentProfileImageUrl = formData.profile_image_url;
      let currentCoverImageUrl = formData.cover_image_url;

      if (profileImageFile) {
        console.log("[EditMemorial] Inside profileImageFile block. Cleaned 'id' available here is:", cleanedId);
        console.log("[EditMemorial] Attempting to upload profile image:", profileImageFile.name);
        try {
            const profileImageUniqueId = `profile_${Date.now()}`;
            const profileImageExt = profileImageFile.name.split('.').pop();

          const profileImageBase = 'memorials/' + cleanedId + '/profile/';
const profileImageName = profileImageUniqueId + '.' + profileImageExt;
const profileImagePath = profileImageBase + profileImageName;
console.log(`[EditMemorial] Values for profileImagePath: cleanedId='<span class="math-inline">\{cleanedId\}', uniqueId\='</span>{profileImageUniqueId}', ext='${profileImageExt}'`);
console.log("[EditMemorial] Profile image path constructed:", profileImagePath);
          
            const { data: profileUploadData, error: profileUploadError } = await supabase.storage
              .from('media')
              .upload(profileImagePath, profileImageFile, { cacheControl: '3600', upsert: true });

            if (profileUploadError) {
              console.error('[EditMemorial] Supabase storage upload error for profile image:', profileUploadError);
              throw new Error(`Profile image upload failed: ${profileUploadError.message}`);
            }
            console.log('[EditMemorial] Profile image uploaded successfully to storage, uploadData:', profileUploadData);

            const { data: profileUrlData } = supabase.storage.from('media').getPublicUrl(profileImagePath);
            currentProfileImageUrl = profileUrlData.publicUrl;
            updates.profile_image_url = currentProfileImageUrl;
            console.log('[EditMemorial] Profile image public URL:', currentProfileImageUrl);
        } catch (profileUploadSpecificError: any) {
            console.error("[EditMemorial] Specific error during profile image upload process:", profileUploadSpecificError);
            toast.error(`Failed to upload profile image: ${profileUploadSpecificError.message}`);
        }
      }

      if (coverImageFile) {
        console.log("[EditMemorial] Inside coverImageFile block. Cleaned 'id' available here is:", cleanedId);
        console.log("[EditMemorial] Attempting to upload cover image:", coverImageFile.name);
        try {
          const coverImageUniqueId = `cover_${Date.now()}`;
          const coverImageExt = coverImageFile.name.split('.').pop();
          
const coverImageBase = 'memorials/' + cleanedId + '/cover/';
const coverImageName = coverImageUniqueId + '.' + coverImageExt;
const coverImagePath = coverImageBase + coverImageName;
console.log(`[EditMemorial] Values for coverImagePath: cleanedId='<span class="math-inline">\{cleanedId\}', uniqueId\='</span>{coverImageUniqueId}', ext='${coverImageExt}'`);
console.log("[EditMemorial] Cover image path constructed:", coverImagePath);    

          

          const { data: coverUploadData, error: coverUploadError } = await supabase.storage
            .from('media')
            .upload(coverImagePath, coverImageFile, { cacheControl: '3600', upsert: true });

          if (coverUploadError) {
            console.error('[EditMemorial] Supabase storage upload error for cover image:', coverUploadError);
            throw new Error(`Cover image upload failed: ${coverUploadError.message}`);
          }
          console.log('[EditMemorial] Cover image uploaded successfully to storage, uploadData:', coverUploadData);

          const { data: coverUrlData } = supabase.storage.from('media').getPublicUrl(coverImagePath);
          currentCoverImageUrl = coverUrlData.publicUrl;
          updates.cover_image_url = currentCoverImageUrl;
          console.log('[EditMemorial] Cover image public URL:', currentCoverImageUrl);
        } catch (coverUploadSpecificError: any) {
          console.error("[EditMemorial] Specific error during cover image upload process:", coverUploadSpecificError);
          toast.error(`Failed to upload cover image: ${coverUploadSpecificError.message}`);
        }
      }

      if (!updates.profile_image_url && currentProfileImageUrl !== undefined) updates.profile_image_url = currentProfileImageUrl;
      if (!updates.cover_image_url && currentCoverImageUrl !== undefined) updates.cover_image_url = currentCoverImageUrl;

      console.log(`[EditMemorial] ABOUT TO UPDATE 'memorials' table with data for ID '${cleanedId}':`, updates);
      const { error: updateError } = await supabase
        .from('memorials')
        .update(updates)
        .eq('id', cleanedId); // Use cleanedId

      console.log('[EditMemorial] Supabase update error for memorial (immediately after call):', updateError);

      if (updateError) {
        throw updateError;
      }

      toast.dismiss();
      toast.success('Memorial updated successfully!');
      navigate(`/memorials/${cleanedId}`); // Use cleanedId

    } catch (err: any) {
      toast.dismiss();
      console.error('Error in handleSubmit (EditMemorial) catch block:', err);
      const displayError = err.message || 'Failed to update the memorial. Please try again.';
      setError(displayError);
      toast.error(displayError);
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return ( <div className="container mx-auto px-4 py-16 text-center"> <div className="animate-pulse text-slate-600">Loading memorial data...</div> </div> );
  }

  if (!memorial && !fetchLoading) {
      return ( <div className="container mx-auto px-4 py-16 text-center"> <p className="text-red-500">Could not load memorial data. You may not have permission or the memorial does not exist.</p> <Link to="/dashboard"> <Button variant="primary" className="mt-4">Return to Dashboard</Button> </Link> </div> );
  }

  return (
    // JSX for the form remains the same as your provided code
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-serif text-slate-800 mb-4">
            Edit Memorial: {formData.title || 'Loading title...'}
          </h1>
          <p className="text-slate-600 mb-8">
            Update the details of this memorial page.
          </p>
          {error && ( <div className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md"> {error} </div> )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input label="Memorial Title" name="title" placeholder="e.g., In Memory of John Smith" value={formData.title || ''} onChange={handleInputChange} required />
            <TextArea label="Bio / Description" name="bio" placeholder="Share memories, stories, or a brief description of your loved one's life..." value={formData.bio || ''} onChange={handleInputChange} minRows={4} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Birth Date" type="date" name="birth_date" value={formData.birth_date || ''} onChange={handleInputChange} />
              <Input label="Death Date" type="date" name="death_date" value={formData.death_date || ''} onChange={handleInputChange} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ImageUpload label="Profile Image" initialImage={formData.profile_image_url} onImageChange={setProfileImageFile} aspectRatio="profile" />
              <ImageUpload label="Cover Image" initialImage={formData.cover_image_url} onImageChange={setCoverImageFile} aspectRatio="cover" />
            </div>
            <div>
              <label htmlFor="visibility" className="block text-sm font-medium text-slate-700 mb-1">Visibility</label>
              <select id="visibility" name="visibility" value={formData.visibility} onChange={handleInputChange}
                className="w-full px-3 py-2 bg-white border shadow-sm border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                <option value="public">Public - Anyone can view</option>
                <option value="friends_only">Friends Only - Only connections can view</option>
                <option value="private">Private - Only you (and assigned editors/owners) can view</option>
              </select>
            </div>
            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate(cleanedId ? `/memorials/${cleanedId}` : '/dashboard')}> Cancel </Button>
              <Button type="submit" isLoading={loading}> Save Changes </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditMemorial;