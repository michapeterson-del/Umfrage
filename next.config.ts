import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "pdfkit", "exceljs"],
};

export default nextConfig;
