import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://ibosxmdvalbqxjftfrlj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlib3N4bWR2YWxicXhqZnRmcmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNzQ2ODcsImV4cCI6MjA5Njc1MDY4N30.HVvrMu7uLSoXcVu6vjCvlTA24-wn6AJlvvMYrWE-hXc"
);
