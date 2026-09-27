import { Activity, RefreshCw, Server, ShieldCheck, Wifi } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useCall } from '../../calls/CallContext.jsx';
import { fetchCallInfrastructureHealth } from '../../services/callInfrastructureService.js';

function value(value, suffix = '') {
  return Number.isFinite(value) ? `${Math.round(value)}${suffix}` : '--';
}

function statusText(value) {
  return value ? 'Ready' : 'Missing';
}

export default function CallDiagnosticsPanel() {
  const location = useLocation();
  const { call } = useCall();
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);

  const enabled = useMemo(
    () => new URLSearchParams(location.search).get('diagnostics') === '1',
    [location.search],
  );

  async function refresh() {
    setLoading(true);
    setHealth(await fetchCallInfrastructureHealth());
    setLoading(false);
  }

  useEffect(() => {
    if (enabled) refresh();
  }, [enabled]);

  if (!enabled) return null;

  const stats = call.diagnostics || {};

  return (
    <section className="mb-3 rounded-2xl border border-roseGold/25 bg-black/35 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.17em] text-roseGold">
            <Activity size={14} />
            Call diagnostics
          </p>
          <p className="mt-1 text-xs text-pink-100/55">
            Developer diagnostics only. No SDP, ICE addresses, or secrets are displayed.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-pink-100 disabled:opacity-40"
          aria-label="Refresh call infrastructure diagnostics"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Quality" value={stats.quality || 'unknown'} />
        <Metric label="RTT" value={value(stats.rttMs, ' ms')} />
        <Metric label="Jitter" value={value(stats.jitterMs, ' ms')} />
        <Metric label="Packet loss" value={value(stats.packetLossPct, '%')} />
        <Metric label="Inbound" value={value(stats.inboundKbps, ' kbps')} />
        <Metric label="Outbound" value={value(stats.outboundKbps, ' kbps')} />
        <Metric label="FPS" value={value(stats.fps)} />
        <Metric
          label="Video"
          value={
            stats.frameWidth && stats.frameHeight
              ? `${stats.frameWidth}×${stats.frameHeight}`
              : '--'
          }
        />
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        <Status
          icon={<Server size={14} />}
          label="Firebase Admin"
          value={health ? statusText(health.firebaseAdmin) : 'Checking'}
        />
        <Status
          icon={<Wifi size={14} />}
          label="TURN"
          value={health ? statusText(health.turnConfigured) : 'Checking'}
        />
        <Status
          icon={<ShieldCheck size={14} />}
          label="Cleanup secret"
          value={health ? statusText(health.cronSecretConfigured) : 'Checking'}
        />
      </div>
    </section>
  );
}

function Metric({ label, value: displayValue }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.13em] text-pink-100/45">{label}</p>
      <p className="mt-1 text-sm text-white">{displayValue}</p>
    </div>
  );
}

function Status({ icon, label, value: displayValue }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-pink-100/75">
      {icon}
      <span>{label}</span>
      <span className="ml-auto text-white">{displayValue}</span>
    </div>
  );
}
