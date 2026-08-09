import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ScreenTopBar } from '../components/ScreenTopBar'
import { useAuth } from '../core/AuthContext'
import type { UpdateProfileRequest, UserProfile } from '../core/models'
import { authApi } from '../core/services'
import { ApiError } from '../core/utils/apiError'

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'] as const

const COMPLETION_FIELDS: Array<{ label: string; key: keyof UserProfile }> = [
  { label: 'Full name', key: 'full_name' },
  { label: 'Phone', key: 'phone' },
  { label: 'Ghana card', key: 'ghana_card' },
  { label: 'Nationality', key: 'nationality' },
  { label: 'Date of birth', key: 'date_of_birth' },
  { label: 'Gender', key: 'gender' },
  { label: 'Staff ID', key: 'staff_id' },
  { label: 'Company', key: 'company' },
  { label: 'Current branch', key: 'current_branch' },
  { label: 'Address', key: 'address' },
  { label: 'Location', key: 'location' },
  { label: 'WhatsApp number', key: 'whatsapp_number' },
  { label: 'Facebook URL', key: 'facebook_url' },
  { label: 'LinkedIn URL', key: 'linkedin_url' },
  { label: 'Twitter/X URL', key: 'twitter_url' },
  { label: 'Instagram URL', key: 'instagram_url' },
  { label: 'Profile photo', key: 'profile_picture_url' },
]

function present(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === 'string') return value.trim().length > 0
  return true
}

function emptyToNull(value: string): string | null {
  const t = value.trim()
  return t ? t : null
}

export function ProfileEditPage() {
  const { user, setUserProfile, refreshUser } = useAuth()
  const fileRef = useRef<HTMLInputElement | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(user)

  const [fullname, setFullname] = useState('')
  const [phone, setPhone] = useState('')
  const [ghanaCard, setGhanaCard] = useState('')
  const [nationality, setNationality] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [staffId, setStaffId] = useState('')
  const [company, setCompany] = useState('')
  const [branch, setBranch] = useState('')
  const [address, setAddress] = useState('')
  const [locationText, setLocationText] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [facebook, setFacebook] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [twitter, setTwitter] = useState('')
  const [instagram, setInstagram] = useState('')

  const hydrate = (me: UserProfile) => {
    setProfile(me)
    setFullname(me.full_name || '')
    setPhone(me.phone || '')
    setGhanaCard(me.ghana_card || '')
    setNationality(me.nationality || '')
    setDob(me.date_of_birth || '')
    setGender(me.gender || '')
    setStaffId(me.staff_id || '')
    setCompany(me.company || '')
    setBranch(me.current_branch || '')
    setAddress(me.address || '')
    setLocationText(me.location || '')
    setWhatsapp(me.whatsapp_number || '')
    setFacebook(me.facebook_url || '')
    setLinkedin(me.linkedin_url || '')
    setTwitter(me.twitter_url || '')
    setInstagram(me.instagram_url || '')
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void authApi
      .me()
      .then((me) => {
        if (cancelled) return
        hydrate(me)
        setUserProfile(me)
      })
      .catch(() => {
        if (!cancelled && user) hydrate(user)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2400)
    return () => window.clearTimeout(t)
  }, [toast])

  const completion = useMemo(() => {
    if (!profile) return { percent: 0, completed: 0, total: 17, missing: [] as string[] }
    const missing: string[] = []
    let completed = 0
    for (const field of COMPLETION_FIELDS) {
      if (present(profile[field.key])) completed += 1
      else missing.push(field.label)
    }
    return {
      percent: Math.round((completed / COMPLETION_FIELDS.length) * 100),
      completed,
      total: COMPLETION_FIELDS.length,
      missing,
    }
  }, [profile])

  const onUpload = async (file: File | null) => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const updated = await authApi.uploadProfileImage(file)
      hydrate(updated)
      setUserProfile(updated)
      setToast('Profile photo updated')
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Failed to upload photo',
      )
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!fullname.trim()) {
      setError('Full name is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload: UpdateProfileRequest = {
        fullname: fullname.trim(),
        phone: emptyToNull(phone),
        ghana_card: emptyToNull(ghanaCard),
        nationality: emptyToNull(nationality),
        date_of_birth: emptyToNull(dob),
        gender: emptyToNull(gender),
        staff_id: emptyToNull(staffId),
        company: emptyToNull(company),
        current_branch: emptyToNull(branch),
        address: emptyToNull(address),
        location: emptyToNull(locationText),
        whatsapp_number: emptyToNull(whatsapp),
        facebook_url: emptyToNull(facebook),
        linkedin_url: emptyToNull(linkedin),
        twitter_url: emptyToNull(twitter),
        instagram_url: emptyToNull(instagram),
      }
      const updated = await authApi.updateProfile(payload)
      hydrate(updated)
      setUserProfile(updated)
      await refreshUser()
      setToast('Profile updated')
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Failed to update profile',
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="settings-subpage">
        <ScreenTopBar title="Edit Profile" showAvatar={false} />
        <div className="loading-state">
          <i className="ri-loader-4-line spin" aria-hidden />
          <p>Loading…</p>
        </div>
      </div>
    )
  }

  const photo = profile?.profile_picture_url
  const displayName = fullname.trim() || 'Your profile'
  const displayEmail = profile?.email?.trim() || 'Update your details'

  return (
    <div className="profile-edit-page">
      <ScreenTopBar title="Edit Profile" showAvatar={false} />

      {error && (
        <div className="auth-alert auth-alert-error">
          <i className="ri-error-warning-line" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <form className="profile-edit-form" onSubmit={(e) => void submit(e)}>
        <div className="profile-edit-hero">
          <div className="profile-edit-avatar-wrap">
            {photo ? (
              <img src={photo} alt="" className="profile-edit-avatar" />
            ) : (
              <div className="profile-edit-avatar profile-edit-avatar-ph">
                <i className="ri-user-fill" aria-hidden />
              </div>
            )}
            <button
              type="button"
              className="profile-edit-camera"
              aria-label="Change profile photo"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <i className="ri-loader-4-line spin" aria-hidden />
              ) : (
                <i className="ri-camera-line" aria-hidden />
              )}
            </button>
          </div>
          <h2>{displayName}</h2>
          <p>{displayEmail}</p>
          <button
            type="button"
            className="profile-edit-photo-link"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? 'Uploading...' : 'Change profile photo'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="profile-completion-card">
          <div className="profile-completion-top">
            <span>Profile completion</span>
            <strong>{completion.percent}%</strong>
          </div>
          <div className="profile-completion-bar">
            <span style={{ width: `${completion.percent}%` }} />
          </div>
          <p>
            {completion.completed} of {completion.total} fields completed
          </p>
          {completion.missing.length > 0 && (
            <div className="profile-completion-missing">
              {completion.missing.slice(0, 3).map((label) => (
                <span key={label}>{label}</span>
              ))}
              {completion.missing.length > 3 ? (
                <span>+{completion.missing.length - 3} more</span>
              ) : null}
            </div>
          )}
        </div>

        <section className="profile-edit-section">
          <div className="profile-edit-section-head">
            <span className="profile-edit-section-icon">
              <i className="ri-badge-line" aria-hidden />
            </span>
            <div>
              <h3>User Profile</h3>
              <p>Personal information and account details</p>
            </div>
          </div>

          <label className="profile-edit-field">
            <span>Full name</span>
            <input value={fullname} onChange={(e) => setFullname(e.target.value)} required />
          </label>
          <label className="profile-edit-field">
            <span>Email</span>
            <input value={profile?.email ?? ''} readOnly disabled />
            <small>Email can’t be changed here</small>
          </label>
          <label className="profile-edit-field">
            <span>Phone</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
          </label>
          <label className="profile-edit-field">
            <span>Ghana card</span>
            <input value={ghanaCard} onChange={(e) => setGhanaCard(e.target.value)} />
          </label>
          <label className="profile-edit-field">
            <span>Nationality</span>
            <input value={nationality} onChange={(e) => setNationality(e.target.value)} />
          </label>
          <label className="profile-edit-field">
            <span>Date of birth</span>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </label>
          <label className="profile-edit-field">
            <span>Gender</span>
            <select value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">Select</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <label className="profile-edit-field">
            <span>Staff ID</span>
            <input value={staffId} onChange={(e) => setStaffId(e.target.value)} />
          </label>
        </section>

        <section className="profile-edit-section">
          <div className="profile-edit-section-head">
            <span className="profile-edit-section-icon">
              <i className="ri-building-line" aria-hidden />
            </span>
            <div>
              <h3>Business Profile</h3>
              <p>Company details and social profiles</p>
            </div>
          </div>

          <label className="profile-edit-field">
            <span>Company</span>
            <input value={company} onChange={(e) => setCompany(e.target.value)} />
          </label>
          <label className="profile-edit-field">
            <span>Current branch</span>
            <input value={branch} onChange={(e) => setBranch(e.target.value)} />
          </label>
          <label className="profile-edit-field">
            <span>Address</span>
            <input value={address} onChange={(e) => setAddress(e.target.value)} />
          </label>
          <label className="profile-edit-field">
            <span>Location</span>
            <input value={locationText} onChange={(e) => setLocationText(e.target.value)} />
          </label>
          <label className="profile-edit-field">
            <span>WhatsApp number</span>
            <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} inputMode="tel" />
          </label>
          <label className="profile-edit-field">
            <span>Facebook URL</span>
            <input value={facebook} onChange={(e) => setFacebook(e.target.value)} inputMode="url" />
          </label>
          <label className="profile-edit-field">
            <span>LinkedIn URL</span>
            <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} inputMode="url" />
          </label>
          <label className="profile-edit-field">
            <span>Twitter/X URL</span>
            <input value={twitter} onChange={(e) => setTwitter(e.target.value)} inputMode="url" />
          </label>
          <label className="profile-edit-field">
            <span>Instagram URL</span>
            <input value={instagram} onChange={(e) => setInstagram(e.target.value)} inputMode="url" />
          </label>
        </section>

        <div className="profile-edit-save-wrap">
          <button type="submit" className="profile-edit-save" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {toast && <div className="profile-toast">{toast}</div>}
    </div>
  )
}
