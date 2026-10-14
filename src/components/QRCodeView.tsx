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
      const origin = typeof window !== "undefined" && window.location.origin ? window.location.origin : "https://the-big-bull.vercel.app";
      const resolvedUrl = url || `${origin}/`;
      setTargetUrl(resolvedUrl);

      try {
        const qr = (await QRCode.toDataURL(resolvedUrl, {
          width: size,
          margin: 1,
          color: {
            dark: "#1e3a8a", // Deep Royal Blue
            light: "#ffffff", // Pure White
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
      <div className="p-3 bg-white border-2 border-blue-200 rounded-2xl shadow-lg">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt="Scan to Join"
            className="rounded-xl"
            style={{ width: size, height: size }}
          />
        ) : (
          <div
            className="flex items-center justify-center bg-blue-50 rounded-xl animate-pulse"
            style={{ width: size, height: size }}
          >
            <QrCode className="w-12 h-12 text-blue-600" />
          </div>
        )}
      </div>

      {showText && (
        <div className="mt-3 flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-xs text-blue-700 font-bold uppercase tracking-wider">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Scan with Phone Camera to Join</span>
          </div>
          <div className="mt-1 flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full text-[11px] text-slate-700 font-mono">
            <span className="truncate max-w-[220px]">{targetUrl}</span>
            <button
              onClick={copyUrl}
              className="text-blue-600 hover:text-blue-800 transition cursor-pointer"
              title="Copy URL"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
