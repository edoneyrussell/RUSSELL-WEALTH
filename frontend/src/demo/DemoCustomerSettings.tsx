/** Public profile preview: never reads or writes a visitor's signed-in account. */
export default function DemoCustomerSettings(){
  return <main className="rw-fintech-workspace min-h-screen bg-[#0c1011] px-4 py-7 text-[#ecf1ed] sm:px-7">
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-3xl font-semibold">Account Settings</h1>
      <section data-tour="profile" className="rw-fintech-panel rounded-[22px] border border-[#34483b] bg-[#13191a] p-5">
        <h2 className="text-xl font-semibold">My Profile</h2>
        <p className="mt-3">Demo Investor</p><p className="mt-2 text-sm text-[#a8b6ad]">Fictional account · No sign-in required</p>
        <p className="mt-4 text-sm text-[#a8b6ad]">Personal information and profile picture</p>
        <p className="mt-4 text-sm text-[#a8b6ad]">Read-only demo: trades, transfers, and account changes are disabled.</p>
      </section>
    </div>
  </main>;
}
