import { motion } from "framer-motion";
import AppLogo from "@/components/AppLogo";

export default function Splash() {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center" style={{ backgroundColor: "#357A38" }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <AppLogo size={96} />
      </motion.div>
    </motion.div>
  );
}