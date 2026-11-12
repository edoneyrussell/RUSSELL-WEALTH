import { ShieldCheck, Users, Lock, Activity } from "lucide-react";

export default function AccessManagement() {
  return (
    <main className="min-h-screen bg-[#090C10] p-5 text-[#F0F3F7] sm:p-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-semibold tracking-[0.2em] text-[#91A9BA]">
          RUSSELL WEALTH / SOC OPERATIONS
        </p>

        <div className="mt-5 flex items-center gap-4">
          <div className="rounded-xl border border-[#34404D] bg-[#18232E] p-3">
            <ShieldCheck size={26} />
          </div>
          <div>
            <h1 className="text-3xl font-semibold">Access Management</h1>
            <p className="mt-1 text-sm text-[#91A1B4]">
              Manage users, permissions and account security.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: "User Directory", icon: Users, detail: "Manage registered accounts" },
            { label: "Permissions", icon: Lock, detail: "Customer and SOC access" },
            { label: "Account Activity", icon: Activity, detail: "Review administrative changes" },
          ].map(item => {
            const Icon = item.icon;
            return (
              <div key={item.label}
                className="rounded-2xl border border-[#303B47] bg-[#121922] p-6">
                <Icon size={23} className="text-[#9BB6CE]" />
                <h2 className="mt-5 text-lg font-semibold">{item.label}</h2>
                <p className="mt-2 text-sm text-[#91A1B4]">{item.detail}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-2xl border border-[#303B47] bg-[#121922] p-6">
          <h2 className="text-lg font-semibold">User Access Control</h2>
          <p className="mt-2 text-sm text-[#91A1B4]">
            Access management interface is ready for user directory,
            permission controls, account suspension and administrative audit integration.
          </p>
          <div className="mt-5 rounded-xl border border-dashed border-[#405064] p-5 text-sm text-[#91A1B4]">
            User management API integration pending.
          </div>
        </div>
      </div>
    </main>
  );
}
