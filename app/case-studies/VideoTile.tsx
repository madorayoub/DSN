"use client";

import { useRef } from "react";

import type { VideoCaseStudy } from "./CaseStudiesClient";
import styles from "./case-studies.module.css";

type VideoTileProps = {
  video: VideoCaseStudy;
  onOpen: (video: VideoCaseStudy, trigger?: HTMLElement | null) => void;
  variant?: "grid" | "carousel";
  role?: string;
};

const VideoTile = ({ video, onOpen, variant = "grid", role }: VideoTileProps) => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const handleOpen = () => {
    onOpen(video, buttonRef.current);
  };

  return (
    <article
      className={`${styles.videoTile} ${variant === "carousel" ? styles.videoTileCompact : ""}`.trim()}
      role={role}
    >
      <button
        type="button"
        className={styles.videoButton}
        onClick={handleOpen}
        ref={buttonRef}
        aria-label={`Watch “${video.title}” case study`}
      >
        <span className={styles.videoThumb} aria-hidden="true">
          <img src={video.thumbnail} alt={`${video.title} thumbnail`} loading="lazy" />
          <span className={styles.videoDuration}>
            <span className={styles.srOnly}>Duration: </span>
            {video.duration}
          </span>
        </span>
        <span className={styles.videoMeta}>
          <span className={styles.videoClient}>{`${video.client} · ${video.industry}`}</span>
          <span className={styles.videoTitle}>{video.title}</span>
          <span className={styles.tagList} aria-label="Video tags">
            {video.tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </span>
        </span>
      </button>
    </article>
  );
};

export default VideoTile;
