import { useEffect } from "react";

const areas = [
  {
    number: "01",
    title: "Business & Finance",
    description: "Understanding financial systems, business strategy, and the decisions that shape financial risk.",
  },
  {
    number: "02",
    title: "Computer Science",
    description: "Building technical foundations through programming, software development, and digital systems.",
  },
  {
    number: "03",
    title: "Cybersecurity",
    description: "Exploring how digital systems are attacked, monitored, defended, and improved.",
  },
  {
    number: "04",
    title: "Design & Creativity",
    description: "Combining branding, UI/UX design, and visual communication to create thoughtful digital experiences.",
  },
];

export default function About() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="min-h-screen bg-[#080b0e] text-[#f2f2f3] font-['Inter:Regular']">
      <header className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-5 py-7 md:px-12 md:py-10">
        <a href="/" className="font-['Lora:Regular'] text-[17px] tracking-[2px] md:text-[24px]">
          RUSSELL WEALTH
        </a>
        <a href="/" className="rounded-full border border-[#555b64] px-4 py-2 text-[12px] text-[#b9bdc4] transition hover:border-[#f2f2f3] hover:text-white md:text-[14px]">
          Back to Home ↗
        </a>
      </header>

      <section className="mx-auto max-w-[1280px] px-5 pb-16 pt-12 md:px-12 md:pb-28 md:pt-24">
        <p className="mb-7 text-[11px] uppercase tracking-[4px] text-[#9299a3] md:text-[13px]">
          01 / The person behind the platform
        </p>
        <h1 className="max-w-[1000px] font-['Lora:Regular'] text-[43px] leading-[1.12] tracking-[-1.5px] md:text-[82px]">
          Where business meets <span className="text-[#9299a3]">technology.</span>
        </h1>
        <div className="mt-12 max-w-[760px] border-l border-[#555b64] pl-6 md:mt-16 md:pl-9">
          <p className="text-[18px] leading-[1.75] text-[#d6d9df] md:text-[24px]">
            I'm Edoney Russell, a Computer Science student with a background in Business Administration, building at the intersection of finance, technology, and cybersecurity.
          </p>
          <p className="mt-6 text-[15px] leading-[1.9] text-[#9299a3] md:text-[17px]">
            My interests connect business understanding with technical problem-solving. I am particularly interested in cybersecurity, technology risk, financial systems, and how organizations can build digital services that are both useful and secure.
          </p>
        </div>
      </section>

      <section className="border-y border-[#30363f] bg-[#0d1116]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 md:px-12 md:py-28">
          <p className="mb-5 text-[11px] uppercase tracking-[4px] text-[#9299a3]">
            02 / What I do
          </p>
          <h2 className="mb-12 font-['Lora:Regular'] text-[36px] md:text-[58px]">
            Four disciplines. One direction.
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {areas.map((area) => (
              <article key={area.number} className="min-h-[220px] rounded-[18px] border border-[#30363f] bg-[#14191f] p-7 md:p-9">
                <p className="mb-9 text-[12px] tracking-[3px] text-[#9299a3]">{area.number}</p>
                <h3 className="mb-4 font-['Lora:Regular'] text-[25px] md:text-[30px]">{area.title}</h3>
                <p className="max-w-[450px] text-[15px] leading-[1.8] text-[#b9bdc4]">{area.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1280px] gap-12 px-5 py-20 md:grid-cols-2 md:gap-20 md:px-12 md:py-32">
        <div>
          <p className="mb-6 text-[11px] uppercase tracking-[4px] text-[#9299a3]">
            03 / The project
          </p>
          <h2 className="font-['Lora:Regular'] text-[39px] leading-[1.2] md:text-[62px]">
            Beyond the interface.
          </h2>
        </div>
        <div className="space-y-6 text-[16px] leading-[1.9] text-[#b9bdc4]">
          <p>
            Russell Wealth is an independent fictional fintech and cybersecurity portfolio project. It brings together financial technology, software development, interface design, and security analysis in one connected environment.
          </p>
          <p>
            The customer experience explores investment dashboards and financial interactions. Behind the interface, the security environment explores authentication activity, suspicious behavior, investigation, and defensive controls.
          </p>
          <p>
            The goal is to demonstrate not just how a digital financial platform looks, but how its underlying systems can be built, examined, and protected.
          </p>
          <p className="text-[13px] text-[#9299a3]">
            This is a fictional demonstration. No real investments or transactions take place.
          </p>
        </div>
      </section>

      <section className="border-t border-[#30363f] bg-[#0d1116]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 md:px-12 md:py-28">
          <p className="mb-5 text-[11px] uppercase tracking-[4px] text-[#9299a3]">
            04 / The direction
          </p>
          <h2 className="max-w-[850px] font-['Lora:Regular'] text-[37px] leading-[1.2] md:text-[60px]">
            Building at the intersection of finance, business, and cybersecurity.
          </h2>
          <p className="mt-8 max-w-[730px] text-[16px] leading-[1.9] text-[#b9bdc4]">
            My long-term direction is to apply technical knowledge to real business and financial challenges, particularly in cybersecurity and technology risk. Russell Wealth is one step in developing and demonstrating those capabilities.
          </p>
          <a href="/" className="mt-10 inline-flex rounded-[12px] border border-[#555b64] px-6 py-4 text-[14px] transition hover:bg-[#1a2027]">
            Explore Russell Wealth ↗
          </a>
        </div>
      </section>

      <footer className="border-t border-[#30363f] px-5 py-8 text-center text-[12px] text-[#9299a3]">
        © 2026 Russell Wealth. Designed & Developed by Edoney Russell.
      </footer>
    </main>
  );
}
