"use client";

import { useEffect, useRef } from "react";
import type { MouseEvent, MutableRefObject } from "react";

import type { VideoCaseStudy } from "./CaseStudiesClient";
import styles from "./case-studies.module.css";

type VideoModalProps = {
  video: VideoCaseStudy | null;
  isOpen: boolean;
  onClose: () => void;
  focusTrapRef: MutableRefObject<HTMLElement | null>;
};

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const VideoModal = ({ video, isOpen, onClose, focusTrapRef }: VideoModalProps) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen || !video) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        FOCUSABLE_SELECTOR
      );

      if (!focusable || focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const isShift = event.shiftKey;
      const active = document.activeElement as HTMLElement | null;

      if (isShift && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!isShift && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const node = dialogRef.current;
    node?.addEventListener("keydown", handleKeyDown);

    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      node?.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, video]);

  useEffect(() => {
    if (!isOpen || !video) {
      return undefined;
    }

    const handleFocus = (event: FocusEvent) => {
      const target = event.target as Node | null;
      if (dialogRef.current && target && !dialogRef.current.contains(target)) {
        dialogRef.current.focus();
      }
    };

    document.addEventListener("focus", handleFocus, true);

    return () => {
      document.removeEventListener("focus", handleFocus, true);
    };
  }, [isOpen, video]);

  useEffect(() => {
    if (focusTrapRef) {
      focusTrapRef.current = dialogRef.current;
    }
  }, [focusTrapRef, isOpen]);

  if (!isOpen || !video) {
    return null;
  }

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.modalBackdrop} role="presentation" onClick={handleBackdropClick}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-study-video-title"
        ref={dialogRef}
        tabIndex={-1}
      >
        <button
          type="button"
          className={styles.modalClose}
          onClick={onClose}
          ref={closeButtonRef}
        >
          <span aria-hidden="true">×</span>
          <span className={styles.srOnly}>Close video</span>
        </button>
        <div className={styles.modalHeader}>
          <p className={styles.modalClient}>{`${video.client} · ${video.industry}`}</p>
          <h2 id="case-study-video-title" className={styles.modalTitle}>
            {video.title}
          </h2>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.modalFrame}>
            <iframe
              src={video.videoUrl}
              title={`${video.title} case study video`}
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoModal;
