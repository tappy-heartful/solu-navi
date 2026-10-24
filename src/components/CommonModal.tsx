"use client";

import { useState, useEffect, useRef } from "react";

interface ModalOptions {
  title: string;
  body: string;
  saveLabel?: string;
  cancelLabel?: string;
  resolve: (value: any) => void;
}

let modalSetter: (options: ModalOptions | null) => void;

/**
 * モーダル表示関数
 * @returns 保存時は { success: true, data: { id: value } }、キャンセル時は false
 */
export const showModal = (
  title: string,
  body: string,
  saveLabel?: string,
  cancelLabel?: string
): Promise<any> => {
  return new Promise((resolve) => {
    if (modalSetter) {
      modalSetter({ title, body, saveLabel, cancelLabel, resolve });
    }
  });
};

export default function CommonModal() {
  const [options, setOptions] = useState<ModalOptions | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    modalSetter = setOptions;
  }, []);

  if (!options) return null;

  const handleClose = (result: any) => {
    options.resolve(result);
    setOptions(null);
  };

  const handleSave = () => {
    if (!bodyRef.current) return;

    const formData: Record<string, any> = {};
    const elements = bodyRef.current.querySelectorAll("[id]");

    elements.forEach((el: any) => {
      const id = el.id;
      let value;

      if (el.type === "checkbox") {
        value = el.checked;
      } else if (el.type === "radio") {
        if (el.checked) {
          value = el.value;
        } else {
          return;
        }
      } else {
        value = el.value;
      }
      formData[id] = value;
    });

    handleClose({ success: true, data: formData });
  };

  return (
    <div
      className="modal"
      onClick={(e) => {
        if ((e.target as HTMLElement).classList.contains("modal")) handleClose(false);
      }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
    >
      <div
        className="modal-content"
        style={{
          background: "#fff",
          borderRadius: "12px",
          width: "90%",
          maxWidth: "768px",
          maxHeight: "85%",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
          overflow: "hidden",
        }}
      >
        <div
          className="modal-header"
          style={{
            flexShrink: 0,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 18px",
            borderBottom: "1px solid #e2e8f0",
            fontWeight: "bold",
            fontSize: "18px",
            color: "#1e293b",
          }}
        >
          <span className="modal-title" style={{ whiteSpace: "pre-wrap", lineHeight: 1.4 }}>
            {options.title}
          </span>
          <button
            type="button"
            className="modal-close"
            onClick={() => handleClose(false)}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
              color: "#94a3b8",
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div
          className="modal-body"
          ref={bodyRef}
          dangerouslySetInnerHTML={{ __html: options.body }}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            background: "#fff",
            lineHeight: 1.6,
          }}
        />

        {(options.saveLabel || options.cancelLabel) && (
          <div
            className="confirm-buttons"
            style={{
              flexShrink: 0,
              padding: "16px",
              background: "#f8fafc",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
            }}
          >
            {options.cancelLabel && (
              <button
                type="button"
                className="cancel-button"
                onClick={() => handleClose(false)}
                style={{
                  backgroundColor: "#cbd5e1",
                  color: "#334155",
                  border: "none",
                  padding: "10px 24px",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                {options.cancelLabel}
              </button>
            )}
            {options.saveLabel && (
              <button
                type="button"
                className="save-button"
                onClick={handleSave}
                style={{
                  backgroundColor: "#146081",
                  color: "white",
                  border: "none",
                  padding: "10px 24px",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                {options.saveLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
