import { PAYERS, type Patient } from '@eligibility/shared';
import { useQuery } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { api } from '../lib/api.js';
import { useDebouncedValue } from '../lib/useDebouncedValue.js';

interface Props {
  selectedId: string | null;
  onSelect: (p: Patient) => void;
}

export function PatientSearch({ selectedId, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 250);
  const inputId = useId();

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['patients', debounced],
    queryFn: () => api.searchPatients(debounced),
    placeholderData: (prev) => prev, // keep the old list while the new one loads
  });

  return (
    <div className="stack">
      <label htmlFor={inputId} className="label">
        Search by name or member ID
      </label>
      <input
        id={inputId}
        className="input"
        type="search"
        placeholder="e.g. Alvarez or DD-55012"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
      />

      {isError && <p className="error">Could not load patients: {error.message}</p>}
      {isPending && !data && <p className="muted">Loading…</p>}

      {data && data.length === 0 && <p className="muted">No patients match “{debounced}”.</p>}

      {data && data.length > 0 && (
        <ul className="list" role="listbox" aria-label="Patients">
          {data.map((p) => {
            const selected = p.id === selectedId;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`list__item${selected ? ' list__item--selected' : ''}`}
                  onClick={() => onSelect(p)}
                >
                  <span className="list__primary">
                    {p.lastName}, {p.firstName}
                  </span>
                  <span className="list__secondary">
                    DOB {p.dob} · {PAYERS[p.payerId]} · {p.memberId}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
