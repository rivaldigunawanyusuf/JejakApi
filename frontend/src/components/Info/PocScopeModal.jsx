import React, { useEffect } from 'react';
import { X, FlaskConical, MapPin, CheckCircle2, Rocket, ArrowRight } from 'lucide-react';

export const POC_REGIONS = [
  { name: 'Sumatera Selatan', detail: 'Kab. Ogan Komering Ilir (OKI)', color: '#f59e0b' },
  { name: 'Kalimantan Tengah', detail: 'Pulang Pisau & Palangka Raya', color: '#f59e0b' },
  { name: 'Kalimantan Barat', detail: 'Ketapang & Kubu Raya', color: '#f59e0b' },
  { name: 'Papua Selatan', detail: 'Kab. Merauke', color: '#10b981' },
  { name: 'Papua Barat Daya', detail: 'Kab. Sorong & Sorong Selatan', color: '#10b981' },
  { name: 'Sulawesi Selatan', detail: 'Maros & Pangkep', color: '#10b981' },
];

const PocScopeModal = ({ isOpen, onClose, onStartTour }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#0a0c10]/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="poc-scope-title"
        className="relative w-[560px] max-w-full max-h-[90vh] overflow-y-auto bg-[#1c1d22] border border-[#383d48] rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-[#38bdf8] to-[#10b981]" />

        <div className="p-4 flex items-start justify-between gap-3 border-b border-[#2d313b] bg-[#18191e]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
              <FlaskConical className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Proof of Concept
              </span>
              <h3 id="poc-scope-title" className="font-semibold text-sm text-[#f1f3f4] mt-1">
                Cakupan Demo: Wilayah Terpilih
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#9aa0a6] hover:text-[#e8eaed] hover:bg-[#282c34] p-1 rounded-md transition-colors"
            title="Tutup (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs text-[#9aa0a6] leading-relaxed">
          <p>
            JEJAK API pada versi ini adalah{' '}
            <strong className="text-[#e8eaed]">demo Proof of Concept (POC)</strong>. Untuk
            membuktikan bahwa pendekatan prediksi risiko karhutla berfungsi, data hanya
            ditampilkan untuk{' '}
            <strong className="text-[#e8eaed]">6 wilayah pantauan utama terpilih</strong> yang
            saat ini menjadi titik karhutla paling rawan di Indonesia.
          </p>

          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/30 text-[11px] text-[#cbd5e1] flex gap-2.5">
            <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong className="text-amber-300">Area di luar 6 wilayah ini tampak kosong
              bukan berarti aman.</strong> Wilayah tersebut belum dimodelkan pada tahap
              POC dan akan ditambahkan pada fase pengembangan berikutnya.
            </span>
          </div>

          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#e8eaed] mb-2">
              Wilayah yang tercakup dalam demo ini
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {POC_REGIONS.map((r) => (
                <li
                  key={r.name}
                  className="p-2 rounded bg-[#202226] border border-[#2d3139] flex items-start gap-2"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: r.color }} />
                  <div>
                    <div className="text-[11px] font-medium text-[#e8eaed]">{r.name}</div>
                    <div className="text-[10px] text-[#9aa0a6]">{r.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#e8eaed] mb-2 flex items-center gap-1.5">
              <Rocket className="w-3.5 h-3.5 text-[#38bdf8]" />
              Mengapa hanya sebagian wilayah?
            </h4>
            <ul className="space-y-1 pl-4 list-disc marker:text-[#38bdf8]">
              <li>Fokus pada validasi konsep dan akurasi model sebelum diperluas.</li>
              <li>
                Setiap wilayah membutuhkan data kanal, jalan, sungai, cuaca, dan batas KHG
                yang harus disiapkan dan divalidasi tersendiri.
              </li>
              <li>
                Menjaga demo tetap cepat dan stabil (ubin statis PMTiles, kueri DuckDB
                di bawah 20 ms).
              </li>
              <li>
                Arsitektur sudah siap diperluas ke seluruh Indonesia tanpa perubahan
                desain.
              </li>
            </ul>
          </div>
        </div>

        <div className="p-3 px-4 bg-[#18191e] border-t border-[#2d313b] flex items-center justify-between gap-2">
          {onStartTour ? (
            <button
              onClick={() => {
                onClose();
                onStartTour();
              }}
              className="px-3 py-1.5 rounded-lg bg-[#24272f] hover:bg-[#2e333d] border border-[#3b4252] text-[#cbd5e1] text-xs font-medium transition-colors"
            >
              Buka Panduan
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-[#38bdf8] hover:bg-[#0284c7] text-[#0f172a] text-xs font-semibold flex items-center gap-1.5 shadow-md transition-colors"
          >
            Mengerti, lihat peta
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PocScopeModal;
