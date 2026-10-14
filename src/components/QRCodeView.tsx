"use client";
import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode, Smartphone, ExternalLink, Copy, Check } from "lucide-react";

interface QRCodeViewProps {
  url?: string;
  size?: number;
  showText?: boolean;
  className?: string;
}

export const QRCodeView: React.FC<QRCodeViewProps> = ({
  url,
  size = 200,
  showText = true,
  className = "",
}) => {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [targetUrl, setTargetUrl] = useState<string>(url || "");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function resolveAndGenerate() {
      let finalUrl = url;
      if (!finalUrl) {
        try {
          const res = await fetch("/api/health");
          const data = await res.json();
          finalUrl = data.joinUrl || `${window.location.origin}/join`;
        } catch (e) {
          finalUrl = `${window.location.origin}/join`;
        }
      }

      const resolvedUrl = finalUrl || `${window.location.origin}/join`;
      setTargetUrl(resolvedUrl);

      try {
        const qr = (await QRCode.toDataURL(resolvedUrl, {
          width: size,
          margin: 1,
          color: {
            dark: "#0a0a0c",
            light: "#fbbf24", // Warm gold background
          },
        })) as string;
        setDataUrl(qr);
      } catch (err) {
        console.error("QR Code generation error:", err);
      }
    }

    resolveAndGenerate();
  }, [url, size]);

  const copyUrl = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <div className="p-3 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl shadow-xl shadow-amber-500/10">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt="Scan to Join"
            className="rounded-xl"
            style={{ width: size, height: size }}
          />
        ) : (
          <div
            className="flex items-center justify-center bg-amber-500/20 rounded-xl animate-pulse"
            style={{ width: size, height: size }}
          >
            <QrCode className="w-12 h-12 text-amber-400" />
          </div>
        )}
      </div>

      {showText && (
        <div className="mt-3 flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold uppercase tracking-wider">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Scan with Phone Camera to Join</span>
          </div>
          <div className="mt-1 flex items-center gap-2 bg-[#121218] border border-[#232330] px-3 py-1 rounded-full text-[11px] text-neutral-300 font-mono">
            <span className="truncate max-w-[200px]">{targetUrl}</span>
            <button
              onClick={copyUrl}
              className="text-amber-400 hover:text-amber-300 transition"
              title="Copy URL"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
