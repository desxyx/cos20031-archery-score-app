'use client';

import { useEffect, useState } from 'react';

type ArrowValue = 'X' | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2' | '1' | 'M';

const ARROW_BUTTONS: ArrowValue[] = ['X', '10', '9', '8', '7', '6', '5', '4', '3', '2', '1', 'M'];

const API_BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

function effectiveNum(v: ArrowValue): number {
  if (v === 'X') return 11;
  if (v === 'M') return 0;
  return parseInt(v, 10);
}

function scoreNum(v: ArrowValue): number {
  if (v === 'X') return 10;
  if (v === 'M') return 0;
  return parseInt(v, 10);
}

type RangeRow = {
  round_range_id: number;
  range_order: number;
  ends_count: number;
  distance_metres: number;
  target_face_cm: number;
  target_face_name: string;
};

type Round = {
  round_id: number;
  name: string;
  total_arrows: number;
  ranges: RangeRow[];
};

type Archer = {
  archer_id: number;
  first_name: string;
  last_name: string;
  email: string;
  default_equipment_type_id: number;
  dob: string;
  gender_id: number;
};

type Equipment = {
  equipment_type_id: number;
  name: string;
  code: string;
};

type Step = 'round-select' | 'archer-select' | 'scoring' | 'review' | 'success';

type Confirmation = {
  stagedScoreId: number;
  shotDate: string;
  shotTime: string;
  roundName: string;
  totalScore: number;
};

function totalEnds(round: Round): number {
  return round.ranges.reduce((s, r) => s + r.ends_count, 0);
}

function overallEnd(round: Round, rangeIdx: number, endIdx: number): number {
  return round.ranges.slice(0, rangeIdx).reduce((s, r) => s + r.ends_count, 0) + endIdx + 1;
}

function endScore(arrows: ArrowValue[]): number {
  return arrows.reduce((s, v) => s + scoreNum(v), 0);
}

function runningTotal(ends: ArrowValue[][]): number {
  return ends.reduce((s, e) => s + endScore(e), 0);
}

function passwordMeetsPolicy(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export default function Home() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [signedInArcher, setSignedInArcher] = useState<Archer | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<Step>('round-select');
  const [selectedRound, setSelectedRound] = useState<Round | null>(null);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number>(0);
  const [completedEnds, setCompletedEnds] = useState<ArrowValue[][]>([]);
  const [currentArrows, setCurrentArrows] = useState<ArrowValue[]>([]);
  const [rangeIdx, setRangeIdx] = useState(0);
  const [endIdx, setEndIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/rounds`).then(r => r.json()),
      fetch(`${API_BASE}/api/archers`).then(r => r.json()),
      fetch(`${API_BASE}/api/me`).then(r => (r.ok ? r.json() : null)),
    ])
      .then(([r, a, me]) => {
        setRounds(r);
        setEquipment(a.equipment_types);
        if (me?.archer) {
          setSignedInArcher(me.archer);
        }
      })
      .catch(() => setLoadError('Failed to load data. Ensure the database is running.'))
      .finally(() => setLoading(false));
  }, []);

  const minSoFar =
    currentArrows.length === 0
      ? Infinity
      : Math.min(...currentArrows.map(effectiveNum));

  function addArrow(v: ArrowValue) {
    if (currentArrows.length >= 6) return;
    if (effectiveNum(v) > minSoFar) return;
    setCurrentArrows(prev => [...prev, v]);
  }

  function clearLast() {
    setCurrentArrows(prev => prev.slice(0, -1));
  }

  function saveEnd() {
    if (currentArrows.length !== 6 || !selectedRound) return;
    const saved = [...currentArrows] as ArrowValue[];
    const newCompleted = [...completedEnds, saved];
    const range = selectedRound.ranges[rangeIdx];
    setCurrentArrows([]);
    setCompletedEnds(newCompleted);
    if (endIdx + 1 < range.ends_count) {
      setEndIdx(e => e + 1);
    } else if (rangeIdx + 1 < selectedRound.ranges.length) {
      setRangeIdx(r => r + 1);
      setEndIdx(0);
    } else {
      setStep('review');
    }
  }

  function resetAll() {
    setStep('round-select');
    setSelectedRound(null);
    setSelectedEquipmentId(0);
    setCompletedEnds([]);
    setCurrentArrows([]);
    setRangeIdx(0);
    setEndIdx(0);
    setSubmitting(false);
    setSubmitError(null);
    setConfirmation(null);
  }

  async function login() {
    const email = loginEmail.trim();
    if (!email || !loginPassword) {
      setLoginError('Enter your email and password');
      return;
    }
    if (!passwordMeetsPolicy(loginPassword)) {
      setLoginError('Password must be 8+ characters with a letter, number, and symbol');
      return;
    }

    setLoggingIn(true);
    setLoginError(null);
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error ?? 'Login failed');
        return;
      }
      setSignedInArcher(data.archer);
      setSelectedEquipmentId(data.archer.default_equipment_type_id);
      setLoginPassword('');
    } catch {
      setLoginError('Network error — please try again');
    } finally {
      setLoggingIn(false);
    }
  }

  async function logout() {
    await fetch(`${API_BASE}/api/logout`, { method: 'POST' });
    resetAll();
    setSignedInArcher(null);
    setLoginPassword('');
    setLoginError(null);
  }

  function discardWithConfirm() {
    if (window.confirm('Discard this score? All entered arrows will be lost.')) {
      resetAll();
    }
  }

  async function submitScore() {
    if (!selectedRound || !selectedArcher || selectedEquipmentId === 0) return;
    setSubmitting(true);
    setSubmitError(null);

    const endPayload: Array<{ rangeOrder: number; endOrder: number; arrows: string[] }> = [];
    let idx = 0;
    for (const range of selectedRound.ranges) {
      for (let e = 0; e < range.ends_count; e++) {
        endPayload.push({ rangeOrder: range.range_order, endOrder: e + 1, arrows: completedEnds[idx] });
        idx++;
      }
    }

    try {
      const res = await fetch(`${API_BASE}/api/staged-scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundId: selectedRound.round_id,
          equipmentTypeId: selectedEquipmentId,
          ends: endPayload,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? 'Submit failed');
        return;
      }
      setConfirmation({
        stagedScoreId: data.staged_score_id,
        shotDate: data.shot_date,
        shotTime: data.shot_time,
        roundName: selectedRound.name,
        totalScore: runningTotal(completedEnds),
      });
      setStep('success');
    } catch {
      setSubmitError('Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedArcher = signedInArcher;
  const selectedEquipment = equipment.find(e => e.equipment_type_id === selectedEquipmentId) ?? null;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <p className="text-red-600">{loadError}</p>
      </div>
    );
  }

  if (step === 'round-select') {
    return (
      <div className="flex flex-col flex-1" style={{ background: '#f9fafb' }}>
        <header style={{ background: '#065f46', padding: '16px 0' }}>
          <div className="content-inner" style={{ padding: '0 16px' }}>
            <h1 className="text-white text-lg font-semibold">Archery Score Entry</h1>
            <p className="text-sm mt-0.5" style={{ color: '#a7f3d0' }}>
              {signedInArcher
                ? `${signedInArcher.first_name} ${signedInArcher.last_name}`
                : 'Select a round'}
            </p>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="content-inner" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {rounds.map(r => (
              <button
                key={r.round_id}
                onClick={() => {
                  setSelectedRound(r);
                  setSelectedEquipmentId(signedInArcher?.default_equipment_type_id ?? 0);
                  setStep('archer-select');
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'white',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <p style={{ fontWeight: 600, color: '#111827', margin: 0 }}>{r.name}</p>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0' }}>
                    {r.total_arrows} arrows · {r.ranges.length} range{r.ranges.length > 1 ? 's' : ''} · {totalEnds(r)} ends
                  </p>
                </div>
                <span style={{ color: '#9ca3af', fontSize: '20px' }}>›</span>
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (step === 'archer-select' && selectedRound) {
    const canStart = signedInArcher !== null && selectedEquipmentId > 0;
    return (
      <div className="flex flex-col flex-1" style={{ background: '#f9fafb' }}>
        <header style={{ background: '#065f46', padding: '16px 0' }}>
          <div className="content-inner" style={{ padding: '0 16px' }}>
            <button
              onClick={() => setStep('round-select')}
              style={{ color: '#a7f3d0', fontSize: '14px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginBottom: '4px' }}
            >
              ‹ Back
            </button>
            <h1 className="text-white text-lg font-semibold">{selectedRound.name}</h1>
            <p className="text-sm" style={{ color: '#a7f3d0' }}>
              {signedInArcher ? 'Confirm equipment' : 'Sign in to score'}
            </p>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="content-inner" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {!signedInArcher ? (
              <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  placeholder="liam.carter@example.com"
                  autoComplete="email"
                  style={{
                    width: '100%',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    fontSize: '16px',
                    color: '#111827',
                    background: 'white',
                    marginBottom: '12px',
                  }}
                />

                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !loggingIn) login();
                  }}
                  placeholder="password123!"
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    fontSize: '16px',
                    color: '#111827',
                    background: 'white',
                  }}
                />

                {loginError && (
                  <p style={{ color: '#dc2626', fontSize: '13px', margin: '10px 0 0' }}>{loginError}</p>
                )}
              </div>
            ) : (
              <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '16px' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#374151', margin: 0 }}>Signed in as</p>
                <p style={{ color: '#111827', fontSize: '16px', fontWeight: 600, margin: '6px 0 2px' }}>
                  {signedInArcher.first_name} {signedInArcher.last_name}
                </p>
                <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>{signedInArcher.email}</p>
                <button
                  onClick={logout}
                  style={{
                    marginTop: '12px',
                    background: 'none',
                    border: 'none',
                    color: '#065f46',
                    fontSize: '14px',
                    fontWeight: 600,
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  Sign out
                </button>
              </div>
            )}

            {signedInArcher && (
              <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '16px' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '10px' }}>
                  Equipment <span style={{ fontWeight: 400, color: '#9ca3af' }}>(this score only)</span>
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {equipment.map(eq => (
                    <label key={eq.equipment_type_id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="equipment"
                        value={eq.equipment_type_id}
                        checked={selectedEquipmentId === eq.equipment_type_id}
                        onChange={() => setSelectedEquipmentId(eq.equipment_type_id)}
                        style={{ width: '18px', height: '18px', accentColor: '#065f46' }}
                      />
                      <span style={{ color: '#111827', fontSize: '15px' }}>
                        {eq.name}
                        {selectedArcher?.default_equipment_type_id === eq.equipment_type_id && (
                          <span style={{ marginLeft: '6px', fontSize: '12px', color: '#065f46' }}>default</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {!signedInArcher && (
              <button
                disabled={loggingIn}
                onClick={login}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: loggingIn ? '#d1d5db' : '#065f46',
                  color: loggingIn ? '#9ca3af' : 'white',
                  fontWeight: 600,
                  fontSize: '16px',
                  cursor: loggingIn ? 'not-allowed' : 'pointer',
                }}
              >
                {loggingIn ? 'Signing in…' : 'Sign In'}
              </button>
            )}

            <button
              disabled={!canStart}
              onClick={() => {
                setCompletedEnds([]);
                setCurrentArrows([]);
                setRangeIdx(0);
                setEndIdx(0);
                setStep('scoring');
              }}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '8px',
                border: 'none',
                background: canStart ? '#065f46' : '#d1d5db',
                color: canStart ? 'white' : '#9ca3af',
                fontWeight: 600,
                fontSize: '16px',
                cursor: canStart ? 'pointer' : 'not-allowed',
              }}
            >
              Start Scoring
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (step === 'scoring' && selectedRound && selectedArcher) {
    const range = selectedRound.ranges[rangeIdx];
    const overallEndNum = overallEnd(selectedRound, rangeIdx, endIdx);
    const totalEndCount = totalEnds(selectedRound);
    const runTotal = runningTotal(completedEnds);
    const endSubtotal = endScore(currentArrows);
    const canSave = currentArrows.length === 6;
    const isLastEnd =
      rangeIdx + 1 === selectedRound.ranges.length &&
      endIdx + 1 === range.ends_count;

    return (
      <div className="flex flex-col flex-1" style={{ background: '#f9fafb' }}>
        <header style={{ background: '#065f46', padding: '12px 0' }}>
          <div
            className="content-inner"
            style={{ padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <div>
              <p style={{ color: 'white', fontWeight: 600, margin: 0 }}>{selectedRound.name}</p>
              <p style={{ color: '#a7f3d0', fontSize: '13px', margin: '2px 0 0' }}>
                {selectedArcher.first_name} {selectedArcher.last_name} · {selectedEquipment?.name}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'white', fontSize: '28px', fontWeight: 700, margin: 0, lineHeight: 1 }}>
                {runTotal + endSubtotal}
              </p>
              <p style={{ color: '#a7f3d0', fontSize: '11px', margin: '2px 0 0' }}>running total</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="content-inner">
            <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '10px 16px' }}>
              <p style={{ fontWeight: 600, color: '#111827', margin: 0 }}>
                End {overallEndNum}{' '}
                <span style={{ color: '#9ca3af', fontWeight: 400 }}>/ {totalEndCount}</span>
              </p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0' }}>
                {range.distance_metres}m · {range.target_face_cm}cm face
              </p>
            </div>

            <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '12px 16px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {Array.from({ length: 6 }).map((_, i) => {
                  const val = currentArrows[i];
                  let bg = '#f9fafb', border = '#e5e7eb', color = '#d1d5db';
                  if (val === 'X') { bg = '#fffbeb'; border = '#fbbf24'; color = '#92400e'; }
                  else if (val === 'M') { bg = '#fef2f2'; border = '#fca5a5'; color = '#dc2626'; }
                  else if (val !== undefined) { bg = '#ecfdf5'; border = '#34d399'; color = '#065f46'; }
                  return (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: '48px',
                        borderRadius: '6px',
                        border: `2px solid ${border}`,
                        background: bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '16px',
                        color,
                      }}
                    >
                      {val ?? '·'}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
                <span>End: <strong style={{ color: '#111827' }}>{endSubtotal}</strong></span>
                <span>{currentArrows.length} / 6</span>
              </div>
            </div>

            <div style={{ padding: '12px 16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {ARROW_BUTTONS.map(v => {
                  const disabled = currentArrows.length >= 6 || effectiveNum(v) > minSoFar;
                  let bg = 'white', border = '#d1d5db', color = '#111827';
                  if (v === 'X') { bg = '#fffbeb'; border = '#fbbf24'; color = '#92400e'; }
                  else if (v === 'M') { bg = '#fef2f2'; border = '#fca5a5'; color = '#dc2626'; }
                  return (
                    <button
                      key={v}
                      onClick={() => addArrow(v)}
                      disabled={disabled}
                      style={{
                        height: '56px',
                        borderRadius: '8px',
                        border: `2px solid ${disabled ? '#e5e7eb' : border}`,
                        background: disabled ? '#f9fafb' : bg,
                        color: disabled ? '#d1d5db' : color,
                        fontWeight: 700,
                        fontSize: '18px',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.45 : 1,
                      }}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ padding: '0 16px 16px', display: 'flex', gap: '10px' }}>
              <button
                onClick={clearLast}
                disabled={currentArrows.length === 0}
                style={{
                  flex: 1,
                  height: '48px',
                  borderRadius: '8px',
                  border: '2px solid #d1d5db',
                  background: 'white',
                  color: '#374151',
                  fontWeight: 600,
                  fontSize: '15px',
                  cursor: currentArrows.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: currentArrows.length === 0 ? 0.4 : 1,
                }}
              >
                Clear ‹
              </button>
              <button
                onClick={saveEnd}
                disabled={!canSave}
                style={{
                  flex: 2,
                  height: '48px',
                  borderRadius: '8px',
                  border: 'none',
                  background: canSave ? '#065f46' : '#d1d5db',
                  color: canSave ? 'white' : '#9ca3af',
                  fontWeight: 600,
                  fontSize: '15px',
                  cursor: canSave ? 'pointer' : 'not-allowed',
                }}
              >
                {isLastEnd ? 'Finish Round ›' : 'Save End ›'}
              </button>
            </div>

            {completedEnds.length > 0 && (
              <div style={{ padding: '0 16px 16px' }}>
                <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>Completed ends</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {completedEnds.map((end, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'white',
                        borderRadius: '6px',
                        border: '1px solid #f3f4f6',
                        padding: '6px 12px',
                        fontSize: '13px',
                      }}
                    >
                      <span style={{ color: '#6b7280', width: '40px' }}>End {i + 1}</span>
                      <span style={{ fontFamily: 'monospace', color: '#374151', flex: 1, textAlign: 'center' }}>
                        {end.join(' ')}
                      </span>
                      <span style={{ fontWeight: 700, color: '#111827', width: '28px', textAlign: 'right' }}>
                        {endScore(end)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  if (step === 'review' && selectedRound && selectedArcher) {
    const total = runningTotal(completedEnds);
    return (
      <div className="flex flex-col flex-1" style={{ background: '#f9fafb' }}>
        <header style={{ background: '#065f46', padding: '16px 0' }}>
          <div className="content-inner" style={{ padding: '0 16px' }}>
            <h1 style={{ color: 'white', fontSize: '18px', fontWeight: 600, margin: 0 }}>Round Complete</h1>
            <p style={{ color: '#a7f3d0', fontSize: '13px', margin: '4px 0 0' }}>
              {selectedRound.name} · {selectedArcher.first_name} {selectedArcher.last_name}
            </p>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="content-inner" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Total Score</p>
              <p style={{ fontSize: '56px', fontWeight: 700, color: '#065f46', margin: '4px 0', lineHeight: 1 }}>{total}</p>
              <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>
                of {selectedRound.total_arrows * 10} possible
              </p>
              <p style={{ fontSize: '14px', color: '#374151', marginTop: '8px' }}>{selectedEquipment?.name}</p>
            </div>

            <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              {completedEnds.map((end, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    borderBottom: i < completedEnds.length - 1 ? '1px solid #f3f4f6' : 'none',
                    fontSize: '14px',
                  }}
                >
                  <span style={{ color: '#6b7280', width: '48px' }}>End {i + 1}</span>
                  <span style={{ fontFamily: 'monospace', color: '#374151', flex: 1, textAlign: 'center' }}>
                    {end.join(' ')}
                  </span>
                  <span style={{ fontWeight: 700, color: '#111827', width: '32px', textAlign: 'right' }}>
                    {endScore(end)}
                  </span>
                </div>
              ))}
            </div>

            {submitError && (
              <p style={{ textAlign: 'center', fontSize: '14px', color: '#dc2626' }}>{submitError}</p>
            )}

            <button
              onClick={submitScore}
              disabled={submitting}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '8px',
                border: 'none',
                background: submitting ? '#d1d5db' : '#065f46',
                color: submitting ? '#9ca3af' : 'white',
                fontWeight: 600,
                fontSize: '16px',
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Submitting…' : 'Submit Score'}
            </button>

            <button
              onClick={discardWithConfirm}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                background: 'white',
                color: '#374151',
                fontWeight: 600,
                fontSize: '15px',
                cursor: 'pointer',
              }}
            >
              Discard
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (step === 'success' && confirmation) {
    const [sy, sm, sd] = confirmation.shotDate.split('-');
    const displayDate = `${sd}/${sm}/${sy}`;
    const [hh, mm] = confirmation.shotTime.split(':');
    const h = parseInt(hh, 10);
    const ampm = h < 12 ? 'am' : 'pm';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const displayTime = `${h12}:${mm} ${ampm}`;

    return (
      <div className="flex flex-col flex-1" style={{ background: '#f9fafb' }}>
        <header style={{ background: '#065f46', padding: '16px 0' }}>
          <div className="content-inner" style={{ padding: '0 16px' }}>
            <h1 style={{ color: 'white', fontSize: '18px', fontWeight: 600, margin: 0 }}>Score Recorded</h1>
            <p style={{ color: '#a7f3d0', fontSize: '13px', margin: '4px 0 0' }}>{confirmation.roundName}</p>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="content-inner" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Total Score</p>
              <p style={{ fontSize: '56px', fontWeight: 700, color: '#065f46', margin: '4px 0', lineHeight: 1 }}>
                {confirmation.totalScore}
              </p>
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <p style={{ fontSize: '14px', color: '#374151', margin: 0 }}>
                  Recorded {displayTime}, {displayDate}
                </p>
                <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>
                  Score ID: #{confirmation.stagedScoreId}
                </p>
              </div>
            </div>

            <button
              onClick={resetAll}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '8px',
                border: 'none',
                background: '#065f46',
                color: 'white',
                fontWeight: 600,
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              New Score
            </button>
          </div>
        </main>
      </div>
    );
  }

  return null;
}
