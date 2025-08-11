import { useState, useMemo, useEffect } from "react";
import { storage, config } from "../lib/appwrite";
import { meta } from "../lib/files";

const PHYSICS_FILE_ID = "68979577003aabf9c510";
const physicsDownloadUrl = config.bucketId ? (storage.getFileDownload(config.bucketId, PHYSICS_FILE_ID).href || storage.getFileDownload(config.bucketId, PHYSICS_FILE_ID)) : "#";

const YEAR_OPTIONS = [
  { key: "1", label: "1st Year" },
  { key: "2", label: "2nd Year" },
  { key: "3", label: "3rd Year" },
  { key: "4", label: "4th Year" },
];

const RESOURCES = {
  "1": [
    {
      title: "Programming Basics",
      subtitle: "C / Python fundamentals, problem solving",
      category: "Programming",
      icon: "💻",
      links: [
        { label: "NPTEL C", href: "https://nptel.ac.in/courses/106/105/106105171/" },
        { label: "Python Docs", href: "https://docs.python.org/3/tutorial/" },
        { label: "Intro DSA", href: "https://www.geeksforgeeks.org/fundamentals-of-algorithms/" },
      ],
    },
    {
      title: "Engineering Mathematics",
      subtitle: "Calculus, Linear Algebra, Probability",
      category: "Math",
      icon: "📐",
      links: [
        { label: "Khan Academy", href: "https://www.khanacademy.org/math" },
        { label: "MIT OCW", href: "https://ocw.mit.edu/" },
      ],
    },
    {
      title: "Physics",
      subtitle: "Physics unit wise notes",
      category: "Theory",
      icon: " ",
      links: [
        { label: "Unit 1", href: physicsDownloadUrl, requireAuth: true },
        { label: "Unit 2", href: "https://nptel.ac.in/courses/109/106/109106050/" },
      ],
    },
  ],
  "2": [
    {
      title: "Data Structures & Algorithms",
      subtitle: "Arrays, Trees, Graphs, DP",
      category: "DSA",
      icon: "🧩",
      links: [
        { label: "GfG DSA", href: "https://www.geeksforgeeks.org/data-structures/" },
        { label: "NeetCode", href: "https://neetcode.io/" },
      ],
    },
    {
      title: "OOP & DBMS",
      subtitle: "Java/C++ OOP, SQL, normalization",
      category: "OOP/DBMS",
      icon: "🗄️",
      links: [
        { label: "Java OOP", href: "https://docs.oracle.com/javase/tutorial/java/concepts/" },
        { label: "SQLBolt", href: "https://sqlbolt.com/" },
      ],
    },
    {
      title: "OS & Discrete Math",
      subtitle: "Processes, memory, combinatorics",
      category: "OS/Discrete",
      icon: "🧮",
      links: [
        { label: "OSTEP", href: "https://pages.cs.wisc.edu/~remzi/OSTEP/" },
        { label: "DM Notes", href: "https://discrete.openmathbooks.org/" },
      ],
    },
  ],
  "3": [
    {
      title: "Web / App Development",
      subtitle: "Frontend, backend, APIs",
      category: "Web/App",
      icon: "🌐",
      links: [
        { label: "MDN Web", href: "https://developer.mozilla.org/" },
        { label: "React", href: "https://react.dev/" },
      ],
    },
    {
      title: "Networks & Systems",
      subtitle: "CN, distributed systems, security",
      category: "Networks/Systems",
      icon: "🛰️",
      links: [
        { label: "CN Basics", href: "https://cs.fyi/guide/computer-networking" },
        { label: "System Design", href: "https://github.com/donnemartin/system-design-primer" },
      ],
    },
    {
      title: "AI / ML",
      subtitle: "ML fundamentals, model building",
      category: "AI/ML",
      icon: "🧠",
      links: [
        { label: "Andrew Ng ML", href: "https://www.coursera.org/learn/machine-learning" },
        { label: "fast.ai", href: "https://www.fast.ai/" },
      ],
    },
  ],
  "4": [
    {
      title: "Interview Prep",
      subtitle: "DSA practice, behavioral, HR",
      category: "Interview",
      icon: "🗣️",
      links: [
        { label: "LeetCode", href: "https://leetcode.com/explore/" },
        { label: "Interviewing.io", href: "https://interviewing.io/" },
      ],
    },
    {
      title: "System Design & DevOps",
      subtitle: "Design, cloud, CI/CD",
      category: "System/DevOps",
      icon: "⚙️",
      links: [
        { label: "GCP Docs", href: "https://cloud.google.com/docs" },
        { label: "Docker", href: "https://docs.docker.com/get-started/" },
      ],
    },
    {
      title: "Capstone & Portfolio",
      subtitle: "Projects, resume, GitHub",
      category: "Capstone",
      icon: "📁",
      links: [
        { label: "Awesome Projects", href: "https://github.com/karan/Projects" },
        { label: "Resume Tips", href: "https://www.careercup.com/resume" },
      ],
    },
  ],
};

export default function Academics() {
  const [year, setYear] = useState("1");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  // DB-driven content state (year -> subjects -> units)
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState("");
  const [dbDocs, setDbDocs] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);

  useEffect(() => {
    let on = true;
    setDbLoading(true);
    setDbError("");
    setSelectedSubject(null);
    meta
      .list({ year })
      .then((d) => {
        if (!on) return;
        setDbDocs(d || []);
      })
      .catch((e) => on && setDbError(e?.message || "Failed to load content"))
      .finally(() => on && setDbLoading(false));
    return () => {
      on = false;
    };
  }, [year]);

  const dbSubjects = useMemo(() => {
    const s = new Set();
    (dbDocs || []).forEach((d) => d?.subject && s.add(d.subject));
    return Array.from(s);
  }, [dbDocs]);

  const isDbYear = ["1", "2", "3", "4"].includes(year);

  const categories = useMemo(() => {
    const cats = new Set(["All"]);
    if (isDbYear) {
      (dbDocs || []).forEach((d) => d?.subject && cats.add(d.subject));
    } else {
      RESOURCES[year].forEach((r) => cats.add(r.category));
    }
    return Array.from(cats);
  }, [year, isDbYear, dbDocs]);

  const items = useMemo(() => {
    return RESOURCES[year].filter((r) => {
      const matchesFilter = filter === "All" || r.category === filter;
      const matchesQuery = !query || `${r.title} ${r.subtitle}`.toLowerCase().includes(query.toLowerCase());
      return matchesFilter && matchesQuery;
    });
  }, [year, filter, query]);

  const currentYearLabel = YEAR_OPTIONS.find((y) => y.key === year)?.label;

  return (
    <div className="academics container">
      <section className="academics-hero">
        <h2>Academic Resources</h2>
        <p className="muted">Curated roadmaps, courses, and notes by year and topic.</p>
        <div className="academics__toolbar">
          <input
            className="searchbar"
            type="text"


            placeholder="Search topics, e.g. DSA, OS, React..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search resources"
          />
        </div>
      </section>

      <div className="academics__controls">
        <header className="academics__header">
          <div className="year-tabs" role="tablist" aria-label="Year selector">
            {YEAR_OPTIONS.map((y) => (
              <button
                key={y.key}
                role="tab"
                className={`year-tab ${year === y.key ? "is-active" : ""}`}
                onClick={() => { setYear(y.key); setFilter("All"); setQuery(""); }}
              >
                {y.label}
              </button>
            ))}
          </div>

          <div className="chips" role="tablist" aria-label="Category filter">
            {categories.map((c) => (
              <button key={c} className={`chip ${filter === c ? "is-active" : ""}`} onClick={() => setFilter(c)}>
                {c}
              </button>
            ))}
          </div>
        </header>

        <div className="metrics">
          <span className="badge">{currentYearLabel}</span>
          <span className="muted">Showing {items.length} resources</span>
        </div>
      </div>

      {(isDbYear) ? (
        <section className="resources-grid">
          {(dbDocs && dbDocs.length > 0) ? (
            Object.entries(dbDocs.reduce((acc, d) => {
              const key = d.subject || "Uncategorized";
              acc[key] = acc[key] || [];
              acc[key].push(d);
              return acc;
            }, {})).map(([subject, docs]) => (
              <article key={subject} className="year-card">
                <div className="year-card__header">
                  <div className="badge badge--category">📘 Subject</div>
                  <h3>{subject}</h3>
                  <p className="muted">Select a unit to download</p>
                </div>
                <div className="year-card__links">
                  {docs
                    .sort((a, b) => (a.unit || "").localeCompare(b.unit || ""))
                    .map((d) => {
                      const href = (storage.getFileDownload(d.bucketId, d.fileId).href || storage.getFileDownload(d.bucketId, d.fileId));
                      return (
                        <a key={d.$id} className="link-badge" href={href} target="_blank" rel="noreferrer">
                          {(d.unit ? d.unit + ": " : "") + (d.title || d.fileId)}
                        </a>
                      );
                    })}
                </div>
              </article>
            ))
          ) : (
            <div className="muted" style={{ gridColumn: "1 / -1", textAlign: "center", padding: 24 }}>
              {dbLoading ? "Loading..." : "No resources for this year yet."}
            </div>
          )}
        </section>
      ) : (
        <section className="resources-grid">
          {items.map((item, idx) => (
            <article key={idx} className="year-card">
              <div className="year-card__header">
                <div className="badge badge--category">{item.icon} {item.category}</div>
                <h3>{item.title}</h3>
                <p className="muted">{item.subtitle}</p>
              </div>
              <div className="year-card__links">
                {item.links.map((l, i) => (
                  <a key={i} className="link-badge" href={l.href} target="_blank" rel="noreferrer">
                    {l.label}
                  </a>
                ))}
              </div>
              <div className="year-card__cta">
                <a className="button ghost" href={item.links[0]?.href} target="_blank" rel="noreferrer">Explore</a>
              </div>
            </article>
          ))}
          {items.length === 0 && (
            <div className="muted" style={{ gridColumn: "1 / -1", textAlign: "center", padding: 24 }}>
              No resources found. Try a different search or category.
            </div>
          )}
        </section>
      )}
    </div>
  );
}

