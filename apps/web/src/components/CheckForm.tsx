import { eligibilityRequestSchema, type EligibilityCheck, type Patient } from '@eligibility/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api, ApiRequestError } from '../lib/api.js';

interface Props {
  patient: Patient;
  onResult: (check: EligibilityCheck) => void;
}

/**
 * The form schema is the API request schema with the patientId pinned, so the
 * same validation rules run in the browser and on the server.
 */
const formSchema = eligibilityRequestSchema.pick({ serviceDate: true }).required();
type FormValues = z.infer<typeof formSchema>;

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function CheckForm({ patient, onResult }: Props) {
  const queryClient = useQueryClient();
  const dateId = useId();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { serviceDate: today() },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => api.runCheck({ patientId: patient.id, serviceDate: values.serviceDate }),
    onSuccess: (check) => {
      onResult(check);
      // The history list for this patient is now stale.
      void queryClient.invalidateQueries({ queryKey: ['checks', patient.id] });
    },
  });

  const serverError = mutation.error instanceof ApiRequestError ? mutation.error : null;

  return (
    <form className="stack" onSubmit={form.handleSubmit((v) => mutation.mutate(v))} noValidate>
      <dl className="kv">
        <div>
          <dt>Patient</dt>
          <dd>
            {patient.lastName}, {patient.firstName}
          </dd>
        </div>
        <div>
          <dt>Member ID</dt>
          <dd>{patient.memberId}</dd>
        </div>
      </dl>

      <label htmlFor={dateId} className="label">
        Date of service
      </label>
      <input id={dateId} className="input" type="date" {...form.register('serviceDate')} />
      {form.formState.errors.serviceDate && (
        <p className="error" role="alert">
          {form.formState.errors.serviceDate.message}
        </p>
      )}

      <button className="button" type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Checking with payer…' : 'Run eligibility check'}
      </button>

      {mutation.isError && (
        <p className="error" role="alert">
          {serverError ? `${serverError.message} (${serverError.code})` : mutation.error.message}
        </p>
      )}
    </form>
  );
}
