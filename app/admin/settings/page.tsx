import { createClient } from "@/lib/supabase/server";
import { GlobalSettingsForm } from "@/components/admin/GlobalSettingsForm";

export const dynamic = "force-dynamic";

type SettingRow = {
  key: string;
  value: unknown;
  is_public: boolean;
};

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("global_settings")
    .select("key, value, is_public")
    .order("key");

  if (error) {
    return (
      <div className="rounded-md border border-red-900/70 bg-red-950/35 p-4 text-sm text-red-200">
        Could not load settings: {error.message}
      </div>
    );
  }

  const rows = (data ?? []) as SettingRow[];

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Global options</h1>
        <p className="mt-1 text-sm text-muted">
          Tune product-wide switches. Values marked public can be read by the
          signed-in app for things like maintenance banners (wire up in UI when
          ready). Session limits in the database still use migration defaults
          until you connect these keys in app code or SQL.
        </p>
      </div>

      <GlobalSettingsForm initialRows={rows} />
    </div>
  );
}
