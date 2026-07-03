import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Check,
  Disc3,
  Eye,
  EyeOff,
  Grid2X2,
  KeyRound,
  ListMusic,
  Loader2,
  Lock,
  LogOut,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { ImageCropper } from "./components/ImageCropper";
import { platformLabels, SocialIcon } from "./components/SocialIcon";
import { SongViews } from "./components/SongViews";
import { friendlyError } from "./lib/errors";
import { IMAGE_BUCKET, validateImageFile } from "./lib/image";
import { adminEmail, getSupabase, isSupabaseConfigured, supabase } from "./lib/supabase";
import type { ImageUploadResult, Profile, SocialLink, SocialPlatform, Song, SongStatus, VisitCounts } from "./lib/types";

const socialPlatforms = Object.keys(platformLabels) as SocialPlatform[];

const emptyProfileForm = {
  musician_name: "",
  greeting: "",
  profile_image_url: "",
  profile_image_path: "",
};

const emptyLinkForm = {
  id: "",
  platform: "youtube" as SocialPlatform,
  label: "",
  url: "",
  icon: "",
};

const emptySongForm = {
  id: "",
  title: "",
  lyrics: "",
  status: "draft" as SongStatus,
  image_url: "",
  image_path: "",
};

let visitRpcCalledForPage = false;

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [visitCounts, setVisitCounts] = useState<VisitCounts | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [screen, setScreen] = useState<"site" | "login" | "admin">("site");
  const [isLoading, setIsLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeSong, setActiveSong] = useState<Song | null>(null);
  const [password, setPassword] = useState("");

  const [profileForm, setProfileForm] = useState(emptyProfileForm);
  const [profileBlob, setProfileBlob] = useState<Blob | null>(null);
  const [profilePreview, setProfilePreview] = useState("");

  const [linkForm, setLinkForm] = useState(emptyLinkForm);
  const [songForm, setSongForm] = useState(emptySongForm);
  const [songBlob, setSongBlob] = useState<Blob | null>(null);
  const [songPreview, setSongPreview] = useState("");
  const [cropTarget, setCropTarget] = useState<{ file: File; target: "profile" | "song" } | null>(null);

  const isBusy = Boolean(busyKey);

  const filteredSongs = useMemo(() => {
    const normalized = searchText.trim().toLocaleLowerCase("ko-KR");
    if (!normalized) return songs;
    return songs.filter((song) => song.title.toLocaleLowerCase("ko-KR").includes(normalized));
  }, [searchText, songs]);

  const emptySongMessage = songs.length === 0 ? "아직 등록된 노래가 없습니다." : "검색 결과가 없습니다.";

  const loadData = useCallback(async (adminMode: boolean) => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const profileRequest = await supabase.from("profiles").select("*").order("created_at", { ascending: true }).limit(1).maybeSingle();
      if (profileRequest.error) throw profileRequest.error;

      const loadedProfile = (profileRequest.data as Profile | null) ?? null;
      setProfile(loadedProfile);
      setProfileForm(
        loadedProfile
          ? {
              musician_name: loadedProfile.musician_name ?? "",
              greeting: loadedProfile.greeting ?? "",
              profile_image_url: loadedProfile.profile_image_url ?? "",
              profile_image_path: loadedProfile.profile_image_path ?? "",
            }
          : emptyProfileForm,
      );

      const linksRequest = await supabase.from("social_links").select("*").order("created_at", { ascending: true });
      if (linksRequest.error) throw linksRequest.error;
      setLinks((linksRequest.data as SocialLink[]) ?? []);

      let songQuery = supabase.from("songs").select("*").order("created_at", { ascending: false });
      if (!adminMode) {
        songQuery = songQuery.eq("status", "published");
      }
      const songsRequest = await songQuery;
      if (songsRequest.error) throw songsRequest.error;
      setSongs((songsRequest.data as Song[]) ?? []);
    } catch (caught) {
      setError(friendlyError(caught, "초기 데이터를 불러오지 못했습니다."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkAdmin = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    setIsAdmin(false);

    if (!supabase || !nextSession) {
      setAuthReady(true);
      return;
    }

    const { data, error: adminError } = await supabase
      .from("site_admins")
      .select("user_id")
      .eq("user_id", nextSession.user.id)
      .maybeSingle();

    if (adminError) {
      setError(friendlyError(adminError, "관리자 권한을 확인하지 못했습니다."));
      setAuthReady(true);
      return;
    }

    if (data) {
      setIsAdmin(true);
      setScreen("admin");
    } else {
      setNotice("로그인은 되었지만 site_admins 테이블에 관리자 UUID가 등록되어 있지 않습니다.");
    }

    setAuthReady(true);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      void checkAdmin(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void checkAdmin(nextSession);
    });

    return () => subscription.unsubscribe();
  }, [checkAdmin]);

  useEffect(() => {
    void loadData(isAdmin);
  }, [isAdmin, loadData]);

  useEffect(() => {
    if (!supabase || visitRpcCalledForPage) return;

    visitRpcCalledForPage = true;

    void (async () => {
      try {
        const { data, error: visitError } = await supabase.rpc("increment_visit");
        if (visitError) throw visitError;
        const counts = normalizeVisitCounts(data);
        if (counts) setVisitCounts(counts);
      } catch (caught) {
        setError(friendlyError(caught, "방문자 수를 갱신하지 못했습니다."));
      }
    })();
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!supabase || !adminEmail) {
      setError("Supabase URL, anon key, 관리자 이메일 환경 변수를 먼저 설정해 주세요.");
      return;
    }

    setBusyKey("login");

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password,
      });

      if (loginError) throw loginError;
      setPassword("");
      setNotice("로그인했습니다.");
    } catch (caught) {
      setError(friendlyError(caught, "로그인하지 못했습니다."));
    } finally {
      setBusyKey("");
    }
  }

  async function handleLogout() {
    if (!supabase) return;
    setBusyKey("logout");
    await supabase.auth.signOut();
    setIsAdmin(false);
    setScreen("site");
    setBusyKey("");
  }

  async function uploadImage(blob: Blob, folder: "profile" | "songs", oldPath?: string | null): Promise<ImageUploadResult> {
    const client = getSupabase();
    const fileName = `${folder}/${Date.now()}-${crypto.randomUUID()}.webp`;
    const { error: uploadError } = await client.storage.from(IMAGE_BUCKET).upload(fileName, blob, {
      contentType: "image/webp",
      cacheControl: "3600",
      upsert: false,
    });

    if (uploadError) throw uploadError;

    const { data } = client.storage.from(IMAGE_BUCKET).getPublicUrl(fileName);

    if (oldPath) {
      const { error: removeError } = await client.storage.from(IMAGE_BUCKET).remove([oldPath]);
      if (removeError) {
        setNotice("새 이미지는 저장했지만 기존 이미지 파일 정리에 실패했습니다.");
      }
    }

    return { url: data.publicUrl, path: fileName };
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusyKey("profile");

    try {
      let nextImageUrl = profileForm.profile_image_url || null;
      let nextImagePath = profileForm.profile_image_path || null;

      if (profileBlob) {
        const uploaded = await uploadImage(profileBlob, "profile", profile?.profile_image_path);
        nextImageUrl = uploaded.url;
        nextImagePath = uploaded.path;
      }

      const payload = {
        ...(profile?.id ? { id: profile.id } : {}),
        musician_name: profileForm.musician_name.trim() || "Untitled Musician",
        greeting: profileForm.greeting.trim(),
        profile_image_url: nextImageUrl,
        profile_image_path: nextImagePath,
        updated_at: new Date().toISOString(),
      };

      const { data, error: saveError } = await getSupabase().from("profiles").upsert(payload).select("*").single();
      if (saveError) throw saveError;

      setProfile(data as Profile);
      setProfileBlob(null);
      setProfilePreview("");
      setNotice("프로필을 저장했습니다.");
      await loadData(true);
    } catch (caught) {
      setError(friendlyError(caught, "프로필을 저장하지 못했습니다."));
    } finally {
      setBusyKey("");
    }
  }

  async function saveLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusyKey("link");

    try {
      const payload = {
        platform: linkForm.platform,
        label: linkForm.label.trim() || platformLabels[linkForm.platform],
        url: linkForm.url.trim(),
        icon: linkForm.icon.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (!payload.url) {
        throw new Error("외부 링크 URL을 입력해 주세요.");
      }

      const request = linkForm.id
        ? getSupabase().from("social_links").update(payload).eq("id", linkForm.id)
        : getSupabase().from("social_links").insert(payload);

      const { error: saveError } = await request;
      if (saveError) throw saveError;

      setLinkForm(emptyLinkForm);
      setNotice("외부 링크를 저장했습니다.");
      await loadData(true);
    } catch (caught) {
      setError(friendlyError(caught, "외부 링크를 저장하지 못했습니다."));
    } finally {
      setBusyKey("");
    }
  }

  async function deleteLink(link: SocialLink) {
    if (!window.confirm(`${link.label || platformLabels[link.platform]} 링크를 삭제할까요?`)) return;
    setBusyKey(`link-${link.id}`);
    setError("");

    try {
      const { error: deleteError } = await getSupabase().from("social_links").delete().eq("id", link.id);
      if (deleteError) throw deleteError;
      setNotice("외부 링크를 삭제했습니다.");
      await loadData(true);
    } catch (caught) {
      setError(friendlyError(caught, "외부 링크를 삭제하지 못했습니다."));
    } finally {
      setBusyKey("");
    }
  }

  async function saveSong(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusyKey("song");

    try {
      let nextImageUrl = songForm.image_url || null;
      let nextImagePath = songForm.image_path || null;

      if (songBlob) {
        const uploaded = await uploadImage(songBlob, "songs", songForm.image_path);
        nextImageUrl = uploaded.url;
        nextImagePath = uploaded.path;
      }

      const payload = {
        title: songForm.title.trim() || "Untitled Track",
        lyrics: songForm.lyrics,
        status: songForm.status,
        image_url: nextImageUrl,
        image_path: nextImagePath,
        updated_at: new Date().toISOString(),
      };

      const request = songForm.id
        ? getSupabase().from("songs").update(payload).eq("id", songForm.id)
        : getSupabase().from("songs").insert(payload);

      const { error: saveError } = await request;
      if (saveError) throw saveError;

      setSongForm(emptySongForm);
      setSongBlob(null);
      setSongPreview("");
      setNotice("곡을 저장했습니다.");
      await loadData(true);
    } catch (caught) {
      setError(friendlyError(caught, "곡을 저장하지 못했습니다."));
    } finally {
      setBusyKey("");
    }
  }

  async function deleteSong(song: Song) {
    if (!window.confirm(`'${song.title}' 곡을 삭제할까요?`)) return;
    setBusyKey(`song-${song.id}`);
    setError("");

    try {
      const { error: deleteError } = await getSupabase().from("songs").delete().eq("id", song.id);
      if (deleteError) throw deleteError;

      if (song.image_path) {
        const { error: removeError } = await getSupabase().storage.from(IMAGE_BUCKET).remove([song.image_path]);
        if (removeError) setNotice("곡은 삭제했지만 이미지 파일 정리에 실패했습니다.");
      }

      setNotice("곡을 삭제했습니다.");
      await loadData(true);
    } catch (caught) {
      setError(friendlyError(caught, "곡을 삭제하지 못했습니다."));
    } finally {
      setBusyKey("");
    }
  }

  function handleImagePick(event: ChangeEvent<HTMLInputElement>, target: "profile" | "song") {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      validateImageFile(file);
      setCropTarget({ file, target });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "이미지를 선택하지 못했습니다.");
    }
  }

  function editSong(song: Song) {
    setSongForm({
      id: song.id,
      title: song.title,
      lyrics: song.lyrics ?? "",
      status: song.status,
      image_url: song.image_url ?? "",
      image_path: song.image_path ?? "",
    });
    setSongBlob(null);
    setSongPreview("");
    setScreen("admin");
  }

  const publicProfileImage = profilePreview || profileForm.profile_image_url || profile?.profile_image_url || "";

  return (
    <main className="app-shell">
      <section className="archive-panel profile-panel" aria-label="뮤지션 프로필">
        <div className="profile-image-wrap">
          {profile?.profile_image_url ? (
            <img src={profile.profile_image_url} alt={`${profile.musician_name} 프로필 사진`} />
          ) : (
            <UserRound size={44} aria-hidden="true" />
          )}
        </div>
        <div className="profile-copy">
          <p className="eyebrow">SMOKED JEWEL CASE</p>
          <h1>{profile?.musician_name || "Untitled Musician"}</h1>
          <p>{profile?.greeting || "아직 인사말이 등록되지 않았습니다."}</p>
          <div className="social-row" aria-label="외부 플랫폼 링크">
            {links.map((link) => (
              <SocialIcon key={link.id} link={link} />
            ))}
          </div>
        </div>
        <div className="counter-rack" aria-label="방문자 수">
          <span>TODAY {padCount(visitCounts?.today_count)}</span>
          <span>TOTAL {padCount(visitCounts?.total_count)}</span>
        </div>
      </section>

      {!isSupabaseConfigured ? (
        <section className="setup-warning" role="status">
          <strong>Supabase 설정이 필요합니다.</strong>
          <span>.env 파일에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_ADMIN_EMAIL을 입력하면 데이터가 연결됩니다.</span>
        </section>
      ) : null}

      {error ? (
        <div className="toast error-toast" role="alert">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="toast notice-toast" role="status">
          {notice}
        </div>
      ) : null}

      <section className="archive-panel songs-panel" aria-label="노래 아카이브">
        <div className="section-head">
          <div>
            <p className="eyebrow">ARCHIVE</p>
            <h2>노래 모음</h2>
          </div>
          <div className="toolbar">
            <label className="search-box">
              <Search size={17} aria-hidden="true" />
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="곡 제목 검색"
                aria-label="곡 제목 검색"
              />
              {searchText ? (
                <button type="button" aria-label="검색어 지우기" onClick={() => setSearchText("")}>
                  <X size={16} />
                </button>
              ) : null}
            </label>
            <div className="segmented" aria-label="보기 방식">
              <button
                type="button"
                className={viewMode === "grid" ? "selected" : ""}
                onClick={() => setViewMode("grid")}
                aria-pressed={viewMode === "grid"}
              >
                <Grid2X2 size={17} /> CD
              </button>
              <button
                type="button"
                className={viewMode === "list" ? "selected" : ""}
                onClick={() => setViewMode("list")}
                aria-pressed={viewMode === "list"}
              >
                <ListMusic size={17} /> 목록
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="loading-state">
            <Loader2 className="spin" size={24} />
            데이터를 불러오는 중입니다.
          </div>
        ) : (
          <SongViews
            songs={filteredSongs}
            activeSongId={activeSong?.id}
            viewMode={viewMode}
            isAdmin={isAdmin}
            emptyMessage={emptySongMessage}
            onOpen={(song) => setActiveSong(activeSong?.id === song.id ? null : song)}
            onClose={() => setActiveSong(null)}
          />
        )}
      </section>

      {screen === "admin" && isAdmin ? (
        <section className="archive-panel admin-panel" aria-label="관리자 편집 화면">
          <div className="section-head">
            <div>
              <p className="eyebrow">ADMIN</p>
              <h2>아카이브 관리</h2>
            </div>
            <button className="ghost-button" type="button" onClick={handleLogout} disabled={busyKey === "logout"}>
              <LogOut size={16} /> 로그아웃
            </button>
          </div>

          <div className="admin-grid">
            <form className="admin-card" onSubmit={saveProfile}>
              <h3>프로필</h3>
              <div className="image-preview large profile-preview">
                {publicProfileImage ? <img src={publicProfileImage} alt="프로필 이미지 미리보기" /> : <UserRound size={34} />}
              </div>
              <label>
                뮤지션명
                <input
                  value={profileForm.musician_name}
                  onChange={(event) => setProfileForm((current) => ({ ...current, musician_name: event.target.value }))}
                />
              </label>
              <label>
                인사말
                <textarea
                  value={profileForm.greeting}
                  rows={5}
                  onChange={(event) => setProfileForm((current) => ({ ...current, greeting: event.target.value }))}
                />
              </label>
              <label className="file-button">
                <Upload size={16} /> 프로필 사진 선택
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => handleImagePick(event, "profile")} />
              </label>
              <button className="primary-button" type="submit" disabled={isBusy}>
                <Save size={16} /> {busyKey === "profile" ? "저장 중..." : "프로필 저장"}
              </button>
            </form>

            <form className="admin-card" onSubmit={saveLink}>
              <h3>외부 링크</h3>
              <label>
                플랫폼
                <select
                  value={linkForm.platform}
                  onChange={(event) => setLinkForm((current) => ({ ...current, platform: event.target.value as SocialPlatform }))}
                >
                  {socialPlatforms.map((platform) => (
                    <option key={platform} value={platform}>
                      {platformLabels[platform]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                표시 이름
                <input value={linkForm.label} onChange={(event) => setLinkForm((current) => ({ ...current, label: event.target.value }))} />
              </label>
              <label>
                URL
                <input
                  type="url"
                  value={linkForm.url}
                  onChange={(event) => setLinkForm((current) => ({ ...current, url: event.target.value }))}
                  placeholder="https://"
                />
              </label>
              <label>
                기타 아이콘 이름
                <input value={linkForm.icon} onChange={(event) => setLinkForm((current) => ({ ...current, icon: event.target.value }))} />
              </label>
              <div className="button-row">
                <button className="primary-button" type="submit" disabled={isBusy}>
                  <Save size={16} /> {busyKey === "link" ? "저장 중..." : "링크 저장"}
                </button>
                {linkForm.id ? (
                  <button className="ghost-button" type="button" onClick={() => setLinkForm(emptyLinkForm)}>
                    취소
                  </button>
                ) : null}
              </div>
              <div className="admin-list">
                {links.map((link) => (
                  <div className="admin-list-row" key={link.id}>
                    <span>{link.label || platformLabels[link.platform]}</span>
                    <div>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label="링크 수정"
                        onClick={() =>
                          setLinkForm({
                            id: link.id,
                            platform: link.platform,
                            label: link.label ?? "",
                            url: link.url,
                            icon: link.icon ?? "",
                          })
                        }
                      >
                        <Check size={16} />
                      </button>
                      <button className="icon-button" type="button" aria-label="링크 삭제" onClick={() => deleteLink(link)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </form>

            <form className="admin-card song-editor" onSubmit={saveSong}>
              <h3>노래</h3>
              <div className="song-editor-layout">
                <div>
                  <div className="image-preview">
                    {songPreview || songForm.image_url ? (
                      <img src={songPreview || songForm.image_url} alt="CD 이미지 미리보기" />
                    ) : (
                      <Disc3 size={34} />
                    )}
                  </div>
                  <label className="file-button">
                    <Upload size={16} /> CD 이미지 선택
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => handleImagePick(event, "song")} />
                  </label>
                </div>
                <div className="form-stack">
                  <label>
                    곡 제목
                    <input value={songForm.title} onChange={(event) => setSongForm((current) => ({ ...current, title: event.target.value }))} />
                  </label>
                  <label>
                    공개 상태
                    <select
                      value={songForm.status}
                      onChange={(event) => setSongForm((current) => ({ ...current, status: event.target.value as SongStatus }))}
                    >
                      <option value="draft">임시 저장</option>
                      <option value="published">공개</option>
                      <option value="private">비공개</option>
                    </select>
                  </label>
                </div>
              </div>
              <label>
                가사
                <textarea
                  value={songForm.lyrics}
                  rows={10}
                  onChange={(event) => setSongForm((current) => ({ ...current, lyrics: event.target.value }))}
                />
              </label>
              <div className="button-row">
                <button className="primary-button" type="submit" disabled={isBusy}>
                  <Save size={16} /> {busyKey === "song" ? "저장 중..." : "곡 저장"}
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setSongForm(emptySongForm);
                    setSongBlob(null);
                    setSongPreview("");
                  }}
                >
                  <Plus size={16} /> 새 곡
                </button>
              </div>
              <div className="admin-list songs-admin-list">
                {songs.map((song) => (
                  <div className="admin-list-row" key={song.id}>
                    <span>
                      {song.status === "published" ? <Eye size={15} /> : <EyeOff size={15} />}
                      {song.title}
                    </span>
                    <div>
                      <button className="icon-button" type="button" aria-label="곡 수정" onClick={() => editSong(song)}>
                        <Check size={16} />
                      </button>
                      <button className="icon-button" type="button" aria-label="곡 삭제" onClick={() => deleteSong(song)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </form>
          </div>
        </section>
      ) : null}

      <footer className="site-footer">
        <button className="lock-button" type="button" aria-label="관리자 로그인" onClick={() => setScreen(isAdmin ? "admin" : "login")}>
          <Lock size={16} />
        </button>
      </footer>

      {screen === "login" ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setScreen("site")}>
          <form className="login-panel" onSubmit={handleLogin} onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">ADMIN</p>
                <h2>관리자 로그인</h2>
              </div>
              <button className="icon-button" type="button" aria-label="로그인 닫기" onClick={() => setScreen("site")}>
                <X size={18} />
              </button>
            </div>
            <label>
              비밀번호
              <input
                type="password"
                value={password}
                autoFocus
                onChange={(event) => setPassword(event.target.value)}
                placeholder="비밀번호 입력"
              />
            </label>
            <button className="primary-button" type="submit" disabled={busyKey === "login" || !authReady}>
              <KeyRound size={16} /> {busyKey === "login" ? "확인 중..." : "로그인"}
            </button>
          </form>
        </div>
      ) : null}

      {cropTarget ? (
        <ImageCropper
          file={cropTarget.file}
          title={cropTarget.target === "profile" ? "프로필 사진 편집" : "CD 이미지 편집"}
          onCancel={() => setCropTarget(null)}
          onApply={(blob, previewUrl) => {
            if (cropTarget.target === "profile") {
              setProfileBlob(blob);
              setProfilePreview(previewUrl);
            } else {
              setSongBlob(blob);
              setSongPreview(previewUrl);
            }
            setCropTarget(null);
          }}
        />
      ) : null}
    </main>
  );
}

function padCount(value?: number) {
  return String(value ?? 0).padStart(4, "0");
}

function normalizeVisitCounts(data: unknown): VisitCounts | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const maybeCounts = row as Partial<VisitCounts>;

  return {
    today_count: Number(maybeCounts.today_count ?? 0),
    total_count: Number(maybeCounts.total_count ?? 0),
  };
}
