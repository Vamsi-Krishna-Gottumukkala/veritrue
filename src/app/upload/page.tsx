"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";

type TabType = "upload" | "text" | "url" | "video";

export default function UploadPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState("");
  const [urlContent, setUrlContent] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && isValidFileType(droppedFile)) {
      setFile(droppedFile);
      if (droppedFile.type.startsWith("image/")) {
        setPreviewUrl(URL.createObjectURL(droppedFile));
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && isValidFileType(selectedFile)) {
      setFile(selectedFile);
      if (selectedFile.type.startsWith("image/")) {
        setPreviewUrl(URL.createObjectURL(selectedFile));
      }
    }
  };

  const isValidFileType = (f: File) => {
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    return validTypes.includes(f.type);
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      const validVideoTypes = [
        "video/mp4",
        "video/webm",
        "video/avi",
        "video/quicktime",
      ];
      if (validVideoTypes.includes(selected.type)) {
        setVideoFile(selected);
      } else {
        alert("Unsupported video format. Use MP4, WEBM, AVI, or MOV.");
      }
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);

    try {
      let analysisResult;

      if (activeTab === "text") {
        // Call text analysis API
        const response = await fetch("/api/analyze/text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: textContent }),
        });

        analysisResult = await response.json();

        if (!response.ok) {
          throw new Error(analysisResult.error || "Analysis failed");
        }

        // Check if response has an error field
        if (analysisResult.error) {
          throw new Error(analysisResult.error);
        }
      } else if (activeTab === "upload" && file) {
        // Call image analysis API
        const formData = new FormData();
        formData.append("image", file);

        const response = await fetch("/api/analyze/image", {
          method: "POST",
          body: formData,
        });

        analysisResult = await response.json();

        if (!response.ok) {
          throw new Error(analysisResult.error || "Image analysis failed");
        }

        if (analysisResult.error) {
          throw new Error(analysisResult.error);
        }
      } else if (activeTab === "url") {
        // Call URL analysis API
        const response = await fetch("/api/analyze/url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: urlContent }),
        });

        analysisResult = await response.json();

        if (!response.ok) {
          throw new Error(analysisResult.error || "URL analysis failed");
        }

        if (analysisResult.error) {
          throw new Error(analysisResult.error);
        }
      } else if (activeTab === "video" && videoFile) {
        // Call video analysis API
        const formData = new FormData();
        formData.append("video", videoFile);

        const response = await fetch("/api/analyze/video", {
          method: "POST",
          body: formData,
        });

        analysisResult = await response.json();

        if (!response.ok) {
          throw new Error(analysisResult.error || "Video analysis failed");
        }

        if (analysisResult.error) {
          throw new Error(analysisResult.error);
        }
      }

      // Store analysis result for results page
      sessionStorage.setItem("analysisResult", JSON.stringify(analysisResult));
      sessionStorage.setItem("analysisType", activeTab);
      sessionStorage.setItem(
        "analysisContent",
        activeTab === "text"
          ? textContent
          : activeTab === "upload"
            ? file?.name || ""
            : activeTab === "video"
              ? videoFile?.name || ""
              : urlContent,
      );

      router.push("/results");
    } catch (error) {
      console.error("Analysis error:", error);
      const msg = error instanceof Error ? error.message : "Unknown error";
      alert(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const canAnalyze = () => {
    switch (activeTab) {
      case "upload":
        return file !== null;
      case "text":
        return textContent.trim().length > 10;
      case "url":
        return urlContent.trim().length > 0 && urlContent.includes(".");
      case "video":
        return videoFile !== null;
      default:
        return false;
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreviewUrl(null);
  };

  return (
    <div className={styles.page}>
      <Link href="/" className={styles.backLink}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M19 12H5M12 19l-7-7 7-7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back
      </Link>

      <section className={styles.uploadSection}>
        <h1 className={styles.title}>
          Upload Content for{" "}
          <span className={styles.textPrimary}>Verification</span>
        </h1>
        <p className={styles.subtitle}>Support for text, images, and videos</p>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "upload" ? styles.active : ""}`}
            onClick={() => setActiveTab("upload")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Upload
          </button>
          <button
            className={`${styles.tab} ${activeTab === "text" ? styles.active : ""}`}
            onClick={() => setActiveTab("text")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Text
          </button>
          <button
            className={`${styles.tab} ${activeTab === "url" ? styles.active : ""}`}
            onClick={() => setActiveTab("url")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            URL
          </button>
          <button
            className={`${styles.tab} ${activeTab === "video" ? styles.active : ""}`}
            onClick={() => setActiveTab("video")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Video
          </button>
        </div>

        {/* Upload Tab Content */}
        {activeTab === "upload" && (
          <div
            className={`${styles.dropzone} ${isDragging ? styles.dragging : ""} ${file ? styles.hasFile : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {file ? (
              <div className={styles.filePreview}>
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className={styles.previewImage}
                  />
                )}
                <div className={styles.fileInfo}>
                  <span className={styles.fileName}>{file.name}</span>
                  <span className={styles.fileSize}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                <button className={styles.clearFile} onClick={clearFile}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6 18L18 6M6 6l12 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <>
                <div className={styles.dropzoneIcons}>
                  <div className={styles.iconWrapper}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
                <p className={styles.dropzoneText}>
                  Drag & drop your media here
                </p>
                <p className={styles.dropzoneSubtext}>
                  Supports JPG, PNG, WEBP
                </p>
                <label className={styles.chooseFileBtn}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Choose File
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={handleFileSelect}
                    className={styles.fileInput}
                  />
                </label>
              </>
            )}
          </div>
        )}

        {/* Text Tab Content */}
        {activeTab === "text" && (
          <div className={styles.textInputContainer}>
            <textarea
              className={styles.textArea}
              placeholder="Paste the article text, news content, or any text you want to verify for misinformation..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={10}
            />
            <div className={styles.charCount}>
              {textContent.length} characters
            </div>
          </div>
        )}

        {/* URL Tab Content */}
        {activeTab === "url" && (
          <div className={styles.urlInputContainer}>
            <div className={styles.urlInputWrapper}>
              <svg
                className={styles.urlIcon}
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <input
                type="url"
                className={styles.urlInput}
                placeholder="https://example.com/news-article"
                value={urlContent}
                onChange={(e) => setUrlContent(e.target.value)}
              />
            </div>
            <p className={styles.urlHelp}>
              Enter the URL of a news article or webpage to analyze its content
            </p>
          </div>
        )}

        {/* Video Tab Content */}
        {activeTab === "video" && (
          <div className={styles.textInputContainer}>
            {videoFile ? (
              <div className={styles.filePreview}>
                <div className={styles.fileInfo}>
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    style={{ color: "var(--color-primary)" }}
                  >
                    <path
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className={styles.fileName}>{videoFile.name}</span>
                  <span className={styles.fileSize}>
                    {(videoFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                <button
                  className={styles.clearFile}
                  onClick={() => setVideoFile(null)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6 18L18 6M6 6l12 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <>
                <div className={styles.dropzoneIcons}>
                  <div className={styles.iconWrapper}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
                <p className={styles.dropzoneText}>
                  Upload a video for deepfake analysis
                </p>
                <p className={styles.dropzoneSubtext}>
                  Supports MP4, WEBM, AVI, MOV (max 50MB)
                </p>
                <label className={styles.chooseFileBtn}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Choose Video
                  <input
                    type="file"
                    accept=".mp4,.webm,.avi,.mov"
                    onChange={handleVideoSelect}
                    className={styles.fileInput}
                  />
                </label>
              </>
            )}
          </div>
        )}

        {/* Analyze Button */}
        <button
          className={`${styles.analyzeBtn} ${!canAnalyze() || isAnalyzing ? styles.disabled : ""}`}
          onClick={handleAnalyze}
          disabled={!canAnalyze() || isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <svg
                className={styles.spinner}
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="60"
                  strokeDashoffset="20"
                />
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Start Verification
            </>
          )}
        </button>
      </section>
    </div>
  );
}
