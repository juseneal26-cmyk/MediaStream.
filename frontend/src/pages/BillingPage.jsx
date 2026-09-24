import { useEffect, useState } from 'react';
import { billingApi } from '../api/billing';
import { useAuth } from '../context/AuthContext';

const PLANS = ['BASICO', 'ESTANDAR', 'PREMIUM'];

export default function BillingPage() {
  const { account } = useAuth();
  const [history, setHistory] = useState([]);
  const [plan, setPlan] = useState('ESTANDAR');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const activeSubscription = history.find((s) => s.status === 'ACTIVA');

  function loadHistory() {
    billingApi
      .history(account.id)
      .then(setHistory)
      .catch(() => setHistory([]));
  }

  useEffect(() => {
    if (account) loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  async function handleSubscribe(e) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);
    try {
      await billingApi.subscribe({ accountId: account.id, plan, cardNumber });
      setMessage('Suscripción creada correctamente.');
      loadHistory();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo procesar el cobro.');
      loadHistory();
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePlan(newPlan) {
    setMessage(null);
    setError(null);
    setLoading(true);
    try {
      await billingApi.changePlan({ accountId: account.id, newPlan, cardNumber });
      setMessage(`Plan cambiado a ${newPlan}.`);
      loadHistory();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cambiar el plan.');
      loadHistory();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page billing-page">
      <h1>Facturación</h1>

      {message && <div className="form-success">{message}</div>}
      {error && <div className="form-error">{error}</div>}

      {!activeSubscription ? (
        <form className="billing-card" onSubmit={handleSubscribe}>
          <h2>Suscribirse</h2>
          <label>
            Plan
            <select value={plan} onChange={(e) => setPlan(e.target.value)}>
              {PLANS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label>
            Número de tarjeta
            <input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} />
          </label>
          <p className="card-hint">
            Tarjetas de prueba: <code>4242 4242 4242 4242</code> aprueba,{' '}
            <code>4000 0000 0000 0002</code> rechaza, cualquier otra queda pendiente.
          </p>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Procesando…' : 'Suscribirse'}
          </button>
        </form>
      ) : (
        <div className="billing-card">
          <h2>Suscripción activa: {activeSubscription.plan}</h2>
          <p>Próximo cobro: {new Date(activeSubscription.nextBillingDate).toLocaleDateString()}</p>
          <label>
            Número de tarjeta (para el cambio de plan)
            <input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} />
          </label>
          <div className="plan-switch">
            {PLANS.filter((p) => p !== activeSubscription.plan).map((p) => (
              <button key={p} className="btn-ghost" disabled={loading} onClick={() => handleChangePlan(p)}>
                Cambiar a {p}
              </button>
            ))}
          </div>
        </div>
      )}

      <h2>Historial</h2>
      <table className="billing-history">
        <thead>
          <tr>
            <th>Plan</th>
            <th>Estado</th>
            <th>Próximo cobro</th>
            <th>Pagos</th>
          </tr>
        </thead>
        <tbody>
          {history.map((s) => (
            <tr key={s.id}>
              <td>{s.plan}</td>
              <td>{s.status}</td>
              <td>{new Date(s.nextBillingDate).toLocaleDateString()}</td>
              <td>
                {s.payments?.map((p) => (
                  <div key={p.id} className={`payment-row payment-${p.status.toLowerCase()}`}>
                    ${p.amount} — {p.status}
                  </div>
                ))}
              </td>
            </tr>
          ))}
          {history.length === 0 && (
            <tr>
              <td colSpan={4}>Sin suscripciones todavía.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
