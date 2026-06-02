            import { createClient } from "@supabase/supabase-js";

            // Supabase 配置（公开密钥，直接硬编码确保所有平台构建正常）
            const supabaseUrl = "https://pyyiiwcidhllptliorvl.supabase.co";
            const supabaseAnonKey = "sb_publishable_TziXFe7CxjUTAfg38VeOzA_J7FEam7Z";

            export const supabase = createClient(supabaseUrl, supabaseAnonKey);
