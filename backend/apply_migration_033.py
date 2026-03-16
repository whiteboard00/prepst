"""
Quick script to apply migration 033 (courses table) via Supabase Management API.

Usage:
  1. Get your DB password from Supabase Dashboard > Settings > Database > Connection string
  2. Run: python apply_migration_033.py <db_password>

  OR: Copy backend/supabase/migrations/033_create_courses_table.sql
      into Supabase Dashboard > SQL Editor and run it.
"""
import sys
import subprocess
import pathlib

def main():
    migration_path = pathlib.Path(__file__).parent / "supabase" / "migrations" / "033_create_courses_table.sql"
    sql = migration_path.read_text()

    if len(sys.argv) < 2:
        print("=" * 60)
        print("OPTION 1: Paste this SQL into Supabase Dashboard > SQL Editor")
        print("=" * 60)
        print()
        print(sql)
        print()
        print("=" * 60)
        print("OPTION 2: Run with DB password")
        print("  python apply_migration_033.py <db_password>")
        print("  (Get password from Supabase Dashboard > Settings > Database)")
        print("=" * 60)
        return

    db_password = sys.argv[1]

    # Load config
    from app.config import get_settings
    settings = get_settings()
    project_ref = settings.supabase_url.split("//")[1].split(".")[0]

    # Connection string for Supabase pooler
    conn_str = f"postgresql://postgres.{project_ref}:{db_password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

    print(f"Applying migration 033 to project {project_ref}...")

    try:
        import psycopg2
        conn = psycopg2.connect(conn_str)
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(sql)
        cur.close()
        conn.close()
        print("Migration applied successfully!")
    except ImportError:
        print("psycopg2 not installed. Trying psql...")
        result = subprocess.run(
            ["psql", conn_str, "-f", str(migration_path)],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            print("Migration applied successfully!")
        else:
            print(f"Error: {result.stderr}")
            print("\nFallback: Copy the SQL above into Supabase Dashboard > SQL Editor")

if __name__ == "__main__":
    main()
