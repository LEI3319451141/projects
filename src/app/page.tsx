"use client";

import { characters, type Character } from "@/lib/characters";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type Variants,
} from "motion/react";
import { Sparkles, Heart, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// 角色标签（从人设中提炼）
const characterTraits: Record<string, string[]> = {
  chuying: ["千年棋魂", "温柔深情", "风雅从容"],
  wuming: ["沉默猎手", "冷峻神秘", "自由至上"],
  yedan: ["极寒之心", "技术理性", "沉稳克制"],
  honglang: ["铁血孤狼", "热情开朗", "温柔守护"],
};

// 悬停发光色（褚嬴主题色过浅，专门定义金色发光）
const glowColors: Record<string, string> = {
  chuying: "#C9A04E", // 暖金色
  wuming: "#1C1C1E",  // 黑色
  yedan: "#5B8FB0",   // 冰蓝
  honglang: "#C8402A",// 暗红
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.6, 0.05, 0.01, 0.9],
    },
  },
};

function CharacterCard({
  character,
  index,
  onSelect,
}: {
  character: Character;
  index: number;
  onSelect: (id: string) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const shouldReduceMotion = useReducedMotion();
  const glowColor = glowColors[character.id] || character.themeColor;

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), {
    stiffness: 300,
    damping: 30,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5, 5]), {
    stiffness: 300,
    damping: 30,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const x = (e.clientX - rect.left - width / 2) / (width / 2);
    const y = (e.clientY - rect.top - height / 2) / (height / 2);
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  return (
    <motion.div variants={itemVariants} style={{ perspective: 1000 }}>
      <motion.div
        style={{
          rotateX: shouldReduceMotion ? 0 : rotateX,
          rotateY: shouldReduceMotion ? 0 : rotateY,
          transformStyle: "preserve-3d",
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        onClick={() => onSelect(character.id)}
        className="group relative cursor-pointer"
      >
        {/* 卡片主体 */}
        <div
          className="relative overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white transition-shadow duration-500"
          style={{
            boxShadow: isHovered
              ? `0 8px 30px ${glowColor}40`
              : "0 2px 12px rgba(0,0,0,0.08)",
          }}
        >
          {/* 悬停渐变遮罩 - 使用角色主题色 */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${glowColor}30 0%, ${glowColor}10 50%, transparent 100%)`,
            }}
            animate={{
              opacity: isHovered ? 1 : 0,
            }}
            transition={{ duration: 0.5 }}
          />

          {/* 悬停时的闪光图标 */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: isHovered ? 1 : 0,
              scale: isHovered ? 1 : 0.6,
            }}
            transition={{ duration: 0.3 }}
            className="absolute right-3 top-3 z-10"
          >
            <Sparkles
              className="h-4 w-4"
              style={{ color: glowColor }}
            />
          </motion.div>

          <div className="relative z-10 p-5 flex flex-col items-center min-h-[180px]">
            {/* 头像区域 - 带旋转光晕环 */}
            <div className="mb-3 flex justify-center">
              <motion.div
                className="relative"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {/* 旋转的光晕环 */}
                <motion.div
                  className="absolute -inset-2 rounded-full opacity-0 blur-xl transition-opacity duration-500"
                  style={{
                    background: `conic-gradient(from 0deg, ${glowColor}, transparent, ${glowColor})`,
                  }}
                  animate={
                    isHovered
                      ? {
                          opacity: 0.8,
                          rotate: shouldReduceMotion ? 0 : 360,
                          scale: shouldReduceMotion ? 1 : [1, 1.08, 1],
                        }
                      : { opacity: 0, rotate: 0, scale: 1 }
                  }
                  transition={{
                    duration: shouldReduceMotion ? 0.6 : 3,
                    repeat: shouldReduceMotion ? 0 : Infinity,
                    ease: "linear",
                  }}
                />
                {/* 头像 */}
                <div
                  className="relative h-[72px] w-[72px] overflow-hidden rounded-full border-2"
                  style={{
                    borderColor: glowColor,
                    boxShadow: `0 2px 12px ${glowColor}30`,
                  }}
                >
                  <motion.img
                    src={character.avatar}
                    alt={character.name}
                    className="h-full w-full object-cover"
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </motion.div>
            </div>

            {/* 角色名称 */}
            <motion.h2
              className="mb-1 text-lg font-bold text-[#0A0A0A]"
              animate={isHovered ? { scale: 1.05 } : { scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              {character.name}
            </motion.h2>

            {/* 标签标语 */}
            <p className="mb-3 text-xs text-[#888888] text-center leading-relaxed px-1">
              {character.tagline}
            </p>

            {/* 角色特质标签 */}
            <motion.div
              className="flex flex-wrap justify-center gap-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: isHovered ? 1 : 0.6,
                y: 0,
              }}
              transition={{ duration: 0.3 }}
            >
              {(characterTraits[character.id] || []).map((trait, idx) => (
                <motion.div
                  key={trait}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 * idx, type: "spring" }}
                >
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-5 font-normal"
                    style={{
                      borderColor: `${glowColor}60`,
                      color: "#666",
                      backgroundColor: `${glowColor}10`,
                    }}
                  >
                    {trait}
                  </Badge>
                </motion.div>
              ))}
            </motion.div>

            {/* 聊天引导 */}
            <motion.div
              className="mt-3 flex items-center gap-1 text-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <MessageCircle
                className="h-3 w-3"
                style={{ color: glowColor }}
              />
              <span style={{ color: glowColor }}>开始聊天</span>
              <Heart
                className="h-3 w-3"
                style={{ color: glowColor }}
              />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const handleSelect = (characterId: string) => {
    router.push(`/chat/${characterId}`);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #FAFAFA 0%, #F0F0F0 100%)",
      }}
    >
      {/* 背景装饰光晕 */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          animate={{
            scale: shouldReduceMotion ? 1 : [1, 1.18, 1],
            rotate: shouldReduceMotion ? 0 : [0, 90, 0],
            opacity: [0.15, 0.3, 0.15],
          }}
          transition={{
            duration: shouldReduceMotion ? 0.6 : 18,
            repeat: shouldReduceMotion ? 0 : Infinity,
            ease: "linear",
          }}
          className="absolute -right-24 -top-24 h-96 w-96 rounded-full blur-[180px]"
          style={{ backgroundColor: "#F5F0E8" }}
        />
        <motion.div
          animate={{
            scale: shouldReduceMotion ? 1 : [1.1, 1, 1.1],
            rotate: shouldReduceMotion ? 0 : [0, -90, 0],
            opacity: [0.15, 0.32, 0.15],
          }}
          transition={{
            duration: shouldReduceMotion ? 0.6 : 16,
            repeat: shouldReduceMotion ? 0 : Infinity,
            ease: "linear",
          }}
          className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full blur-[180px]"
          style={{ backgroundColor: "#B8D4E3" }}
        />
        <motion.div
          animate={{
            scale: shouldReduceMotion ? 1 : [1.05, 1.2, 1.05],
            opacity: [0.1, 0.25, 0.1],
          }}
          transition={{
            duration: shouldReduceMotion ? 0.6 : 20,
            repeat: shouldReduceMotion ? 0 : Infinity,
            ease: "linear",
          }}
          className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[150px]"
          style={{ backgroundColor: "#8B250020" }}
        />
      </div>

      {/* 标题区域 */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.6, 0.05, 0.01, 0.9] }}
        className="text-center mb-8"
      >
        <motion.div className="mb-4 inline-block">
          <Badge
            className="gap-1.5 bg-white/80 backdrop-blur-sm border border-[#E5E5E5] text-[#666]"
            variant="secondary"
          >
            <Sparkles className="h-3 w-3" />
            虚拟男友模拟器
          </Badge>
        </motion.div>
        <motion.h1
          className="text-2xl font-bold text-[#333333] mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          选择你的男友
        </motion.h1>
        <motion.p
          className="text-sm text-[#888888]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          点击头像开始聊天，每位都有独特性格
        </motion.p>
      </motion.div>

      {/* 角色卡片网格 */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-4 w-full max-w-[360px]"
      >
        {characters.map((char, index) => (
          <CharacterCard
            key={char.id}
            character={char}
            index={index}
            onSelect={handleSelect}
          />
        ))}
      </motion.div>

      {/* 底部提示 */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="mt-8 flex flex-col items-center gap-1"
      >
        <p className="text-xs text-[#AAAAAA]">支持文字 / 语音 / 图片互动</p>
      </motion.div>
    </div>
  );
}
