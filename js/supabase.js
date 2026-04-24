
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = 'https://xzvgtbhoxjkgvtafwqyx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6dmd0YmhveGprZ3Z0YWZ3cXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2OTcyODksImV4cCI6MjA4OTI3MzI4OX0.2D6I5m8P1piWY4WjpX4vF3waCzG53wuTHe-Nr3Ka7TM';

export const supabase = createClient(supabaseUrl, supabaseKey);