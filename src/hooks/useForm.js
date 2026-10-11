import { useCallback, useState } from 'react';

// Tiny controlled-form helper: values, change handlers, and server-side field errors.
export function useForm(initial) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});

  const set = useCallback((name, value) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  }, []);

  // <Input {...bind('name')} />
  const bind = (name) => ({
    name,
    value: values[name] ?? '',
    onChange: (e) => set(name, e.target.type === 'checkbox' ? e.target.checked : e.target.value),
    error: errors[name],
  });

  const applyServerErrors = (err) => {
    if (err?.fieldErrors) setErrors(err.fieldErrors);
  };

  return { values, setValues, set, bind, errors, setErrors, applyServerErrors, reset: () => setValues(initial) };
}
