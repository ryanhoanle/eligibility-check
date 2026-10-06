import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

interface Props {
  patientId: string;
}

export function CheckHistory({ patientId }: Props) {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['checks', patientId],
    queryFn: () => api.listChecks(patientId),
  });

  if (isPending) return <p className="muted">Loading…</p>;
  if (isError) return <p className="error">Could not load history: {error.message}</p>;
  if (data.length === 0) return <p className="muted empty">No checks yet for this patient.</p>;

  return (
    <table className="table">
      <thead>
        <tr>
          <th scope="col">When</th>
          <th scope="col">Service date</th>
          <th scope="col">Status</th>
          <th scope="col" className="num">
            Latency
          </th>
          <th scope="col" className="num">
            Attempts
          </th>
        </tr>
      </thead>
      <tbody>
        {data.map((c) => (
          <tr key={c.id}>
            <td>{new Date(c.createdAt).toLocaleString()}</td>
            <td>{c.serviceDate}</td>
            <td>
              <span className={`pill pill--${c.result.status}`}>{c.result.status}</span>
            </td>
            <td className="num">{c.latencyMs} ms</td>
            <td className="num">{c.attempts}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
