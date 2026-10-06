import type { EligibilityCheck, Patient } from '@eligibility/shared';
import { useState } from 'react';
import { CheckForm } from './components/CheckForm.js';
import { CheckHistory } from './components/CheckHistory.js';
import { PatientSearch } from './components/PatientSearch.js';
import { ResultCard } from './components/ResultCard.js';

export function App() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [latest, setLatest] = useState<EligibilityCheck | null>(null);

  function selectPatient(p: Patient) {
    setPatient(p);
    setLatest(null);
  }

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1>EligibilityCheck</h1>
          <p className="muted">Insurance-eligibility verification demo · synthetic data only</p>
        </div>
      </header>

      <main className="app__grid">
        <section className="panel" aria-labelledby="patients-heading">
          <h2 id="patients-heading">1 · Find patient</h2>
          <PatientSearch selectedId={patient?.id ?? null} onSelect={selectPatient} />
        </section>

        <section className="panel" aria-labelledby="check-heading">
          <h2 id="check-heading">2 · Run check</h2>
          {patient ? (
            <>
              <CheckForm patient={patient} onResult={setLatest} />
              {latest && <ResultCard check={latest} />}
            </>
          ) : (
            <p className="muted empty">Select a patient to run an eligibility check.</p>
          )}
        </section>

        <section className="panel" aria-labelledby="history-heading">
          <h2 id="history-heading">3 · History</h2>
          {patient ? (
            <CheckHistory patientId={patient.id} />
          ) : (
            <p className="muted empty">Past checks for the selected patient appear here.</p>
          )}
        </section>
      </main>
    </div>
  );
}
