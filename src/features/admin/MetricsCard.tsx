import React from "react";
import { supabase } from "../../lib/supabase";

const MetricsCard: React.FC = () => {
  const [rows, setRows] = React.useState<Array<{ d: string; name: string; cnt: number }>>([]);

  React.useEffect(() => {
    (async () => {
      try {
        // ignore RPC error if function not present; just try to fetch the MV
        await supabase.rpc("refresh_mv_daily_metrics").catch(() => {});
        const { data } = await supabase
          .from("mv_daily_metrics")
          .select()
          .order("d", { ascending: false })
          .limit(30);
        setRows(data ?? []);
      } catch {
        setRows([]);
      }
    })();
  }, []);

  return (
    <div className="p-4 rounded-xl shadow">
      <h2 className="font-semibold mb-2">Daily Events</h2>
      <ul className="space-y-1">
        {rows.map((r, i) => (
          <li key={i}>
            {new Date(r.d).toLocaleDateString()} — {r.name}: {r.cnt}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MetricsCard;