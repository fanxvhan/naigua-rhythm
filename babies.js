/* ==========================================================================
   奶蛙拍肚肚 · 奶蛙角色与键位图标
   --------------------------------------------------------------------------
   画了四只抱着肚肚的奶蛙：奶糖（草莓）、薄荷（兔兔）、布丁（小熊）、
   紫薯（猫猫）。按下键位时，SVG 会切换成笑到眯眼 + 张嘴 + 笑出眼泪的状态。
   如果 BABY_ASSETS.babyImage 有值，则一律换成用户提供的奶蛙图片。
   ========================================================================== */

(function () {
  "use strict";

  const THEMES = [
    {
      id: "naitang",
      name: "奶糖",
      key: "D",
      code: "KeyD",
      pitch: 72,
      color: "#f58fa3",
      dark: "#d9738a",
      soft: "#ffe5eb",
      shadow: "#e7a5b5",
      ink: "#a13f56",
      glow: "rgba(245, 143, 163, 0.42)",
      hood: "#ffc0cc",
      hoodDark: "#c96f83",
      outfit: "#fff4df",
      outfitDark: "#eccda7",
      accent: "#ff6f8c",
      accessorySoft: "#ffd9e1",
      skin: "#ffe5d1",
      accessory: "strawberry"
    },
    {
      id: "bohe",
      name: "薄荷",
      key: "F",
      code: "KeyF",
      pitch: 76,
      color: "#8edcc4",
      dark: "#56a98f",
      soft: "#e2f8ef",
      shadow: "#9dd6c4",
      ink: "#2c7c66",
      glow: "rgba(142, 220, 196, 0.42)",
      hood: "#a9e7d2",
      hoodDark: "#5ba990",
      outfit: "#fff8e8",
      outfitDark: "#e7d9ba",
      accent: "#43b895",
      accessorySoft: "#d2f3e7",
      skin: "#ffe8d5",
      accessory: "bunny"
    },
    {
      id: "buding",
      name: "布丁",
      key: "J",
      code: "KeyJ",
      pitch: 79,
      color: "#ffd47e",
      dark: "#d4a03c",
      soft: "#fff2ca",
      shadow: "#e6c884",
      ink: "#906614",
      glow: "rgba(255, 212, 126, 0.44)",
      hood: "#ffdf9b",
      hoodDark: "#c99a42",
      outfit: "#fff7e5",
      outfitDark: "#e8d4ad",
      accent: "#f0a936",
      accessorySoft: "#ffeabd",
      skin: "#ffe7d3",
      accessory: "bear"
    },
    {
      id: "zishu",
      name: "紫薯",
      key: "K",
      code: "KeyK",
      pitch: 81,
      color: "#c9b6ff",
      dark: "#9275d9",
      soft: "#eee8ff",
      shadow: "#c3b0e8",
      ink: "#6848b6",
      glow: "rgba(201, 182, 255, 0.46)",
      hood: "#d2c1ff",
      hoodDark: "#8d72cf",
      outfit: "#fff5e9",
      outfitDark: "#e5d0bc",
      accent: "#9c7cf0",
      accessorySoft: "#e7dcff",
      skin: "#ffe6d4",
      accessory: "cat"
    }
  ];

  const LANE_MIDI = [72, 76, 79, 81];

  const ACCESSORY_BACK = {
    strawberry: "",
    bunny: `
      <g>
        <path class="baby-accessory-back" d="M75 98C51 60 57 24 77 20c20-4 22 42 15 80Z"/>
        <path class="baby-accessory-back-inner" d="M79 89C61 55 66 34 77 33c10 1 8 33 6 57Z"/>
        <path class="baby-accessory-back" d="M165 98c24-38 18-74-2-78-20-4-22 42-15 80Z"/>
        <path class="baby-accessory-back-inner" d="M161 89c18-34 13-55 2-56-10 1-8 33-6 57Z"/>
      </g>`,
    bear: `
      <g>
        <circle class="baby-accessory-back" cx="67" cy="56" r="25"/>
        <circle class="baby-accessory-back-inner" cx="67" cy="56" r="12"/>
        <circle class="baby-accessory-back" cx="173" cy="56" r="25"/>
        <circle class="baby-accessory-back-inner" cx="173" cy="56" r="12"/>
      </g>`,
    cat: `
      <g>
        <path class="baby-accessory-back" d="M61 94 64 29c0-7 6-9 11-4l29 31Z"/>
        <path class="baby-accessory-back-inner" d="m70 78 2-33 20 25Z"/>
        <path class="baby-accessory-back" d="M179 94 176 29c0-7-6-9-11-4l-29 31Z"/>
        <path class="baby-accessory-back-inner" d="m170 78-2-33-20 25Z"/>
      </g>`
  };

  const ACCESSORY_FRONT = {
    strawberry: `
      <g>
        <path d="M104 47C89 27 103 8 120 27 127 6 151 16 140 39c16-7 27 8 10 16-16 8-34 0-46-8Z" fill="#8ccb99" stroke="#55825f" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M112 23c5-10 15-9 19 1" fill="none" stroke="#55825f" stroke-width="3" stroke-linecap="round"/>
        <path d="M121 38c-1 7 2 13 5 16" fill="none" stroke="#55825f" stroke-width="2.4" stroke-linecap="round"/>
        <g transform="translate(160 63) rotate(9)">
          <path d="M0 0c11-5 21 4 16 15-4 10-14 12-21 4-6-7-3-14 5-19Z" fill="#ff879d" stroke="#a85b6b" stroke-width="2.2"/>
          <path d="M-2 0C1-8 11-10 16-4c-6-1-11 2-13 6Z" fill="#83c48e" stroke="#55825f" stroke-width="1.8"/>
          <circle cx="6" cy="10" r="1.3" fill="#fff6e8"/>
          <circle cx="14" cy="7" r="1.3" fill="#fff6e8"/>
          <circle cx="10" cy="16" r="1.3" fill="#fff6e8"/>
        </g>
        <g fill="rgba(255, 250, 238, 0.72)">
          <ellipse cx="72" cy="77" rx="2.2" ry="3.2" transform="rotate(-24 72 77)"/>
          <ellipse cx="84" cy="92" rx="2" ry="3" transform="rotate(14 84 92)"/>
          <ellipse cx="163" cy="99" rx="2" ry="3" transform="rotate(28 163 99)"/>
        </g>
      </g>`,
    bunny: `
      <g transform="translate(160 72) rotate(-8)">
        <path d="M0 9C-1-1 5-8 12-4 19 0 17 9 11 13 6 16 1 14 0 9Z" fill="var(--accessory-soft)" stroke="var(--hood-dark)" stroke-width="2"/>
        <circle cx="8" cy="6" r="3.2" fill="var(--accent)"/>
        <path d="M-1 13c4 3 9 4 14 1" fill="none" stroke="var(--hood-dark)" stroke-width="1.8" stroke-linecap="round"/>
      </g>`,
    bear: `
      <g transform="translate(158 66) rotate(8)">
        <path d="M11 0c2 11-8 19-17 13C-13 8-5-1 11 0Z" fill="#f4b84e" stroke="var(--hood-dark)" stroke-width="2"/>
        <path d="M8 2C6 7 2 11-3 12" fill="none" stroke="#fff4cf" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>
        <circle cx="-1" cy="4" r="1.5" fill="var(--hood-dark)" opacity=".5"/>
      </g>`,
    cat: `
      <g transform="translate(158 67)">
        <path d="M10 0 13 8 21 10 14 15 12 23 7 17 0 18 3 10-2 4 6 4Z" fill="var(--accent)" stroke="var(--hood-dark)" stroke-width="1.9" stroke-linejoin="round"/>
        <circle cx="10" cy="10" r="2.1" fill="#fff4dd" opacity=".8"/>
      </g>`
  };

  function escapeAttribute(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[character];
    });
  }

  function themeVariables(theme) {
    return [
      "--hood:" + theme.hood,
      "--hood-dark:" + theme.hoodDark,
      "--outfit:" + theme.outfit,
      "--outfit-dark:" + theme.outfitDark,
      "--accent:" + theme.accent,
      "--accessory-soft:" + theme.accessorySoft,
      "--skin:" + theme.skin
    ].join(";");
  }

  function babySvg(themeIndex) {
    const theme = THEMES[themeIndex] || THEMES[0];
    const accessoryBack = ACCESSORY_BACK[theme.accessory] || "";
    const accessoryFront = ACCESSORY_FRONT[theme.accessory] || "";

    return `
<svg class="baby-svg baby-svg--${theme.id}" viewBox="0 0 240 258" aria-hidden="true" focusable="false" style="${themeVariables(theme)}">
  <ellipse class="baby-shadow" cx="120" cy="247" rx="76" ry="9"/>
  <g class="baby-bob">
    ${accessoryBack}
    <g class="baby-body-group">
      <path class="baby-foot" d="M77 205c-14 12-14 27 3 30 17 3 25-10 23-29Z"/>
      <path class="baby-foot" d="M163 205c14 12 14 27-3 30-17 3-25-10-23-29Z"/>
      <path class="baby-sock" d="M67 222c7 7 18 9 29 6 6-2 9-5 10-9l-1 13c-8 7-19 9-29 7-9-2-12-8-9-17Z"/>
      <path class="baby-sock" d="M173 222c-7 7-18 9-29 6-6-2-9-5-10-9l1 13c8 7 19 9 29 7 9-2 12-8 9-17Z"/>
      <path class="baby-foot" d="M81 224c-2 5 0 9 4 11" fill="none" stroke="var(--hood-dark)" stroke-width="1.8" stroke-linecap="round" opacity=".35"/>
      <path class="baby-foot" d="M159 224c2 5 0 9-4 11" fill="none" stroke="var(--hood-dark)" stroke-width="1.8" stroke-linecap="round" opacity=".35"/>
      <path class="baby-outfit" d="M72 163c-9 25-3 49 17 57 11 5 21 5 31 5s21 0 31-5c20-8 26-32 17-57-15-13-81-13-96 0Z"/>
      <ellipse class="baby-belly" cx="120" cy="194" rx="37" ry="27"/>
      <path class="baby-outfit-detail" d="M93 216c12 5 42 5 54 0"/>
      <circle class="baby-button" cx="120" cy="207" r="2.8"/>
      <circle class="baby-button" cx="120" cy="217" r="2.3"/>
      <g class="baby-arm baby-arm--left">
        <path d="M77 162c-16 11-15 33 3 39 11 4 21-3 22-14 1-9-5-17-12-20Z" fill="var(--outfit)" stroke="var(--hood-dark)" stroke-width="3"/>
        <path d="M78 171c-5 8-4 18 3 23" fill="none" stroke="var(--outfit-dark)" stroke-width="2" stroke-linecap="round" opacity=".7"/>
        <ellipse class="baby-mitten" cx="99" cy="192" rx="14" ry="10.5" transform="rotate(-13 99 192)"/>
        <path d="M89 188c2-3 5-4 7-4M90 194c3-2 6-2 8-1" fill="none" stroke="var(--hood-dark)" stroke-width="1.4" stroke-linecap="round" opacity=".45"/>
      </g>
      <g class="baby-arm baby-arm--right">
        <path d="M163 162c16 11 15 33-3 39-11 4-21-3-22-14-1-9 5-17 12-20Z" fill="var(--outfit)" stroke="var(--hood-dark)" stroke-width="3"/>
        <path d="M162 171c5 8 4 18-3 23" fill="none" stroke="var(--outfit-dark)" stroke-width="2" stroke-linecap="round" opacity=".7"/>
        <ellipse class="baby-mitten" cx="141" cy="192" rx="14" ry="10.5" transform="rotate(13 141 192)"/>
        <path d="M151 188c-2-3-5-4-7-4M150 194c-3-2-6-2-8-1" fill="none" stroke="var(--hood-dark)" stroke-width="1.4" stroke-linecap="round" opacity=".45"/>
      </g>
    </g>
    <g class="baby-head">
      <path class="baby-hood" d="M46 108C42 53 73 19 120 18c47 1 78 35 74 90-3 42-34 64-74 64s-71-22-74-64Z"/>
      <path class="baby-hood-line" d="M64 99c-5-39 22-64 56-64s61 25 56 64"/>
      <path class="baby-hood-highlight" d="M70 75c7-24 24-37 42-40"/>
      <path d="M58 120c0-8 3-15 7-22M182 120c0-8-3-15-7-22" fill="none" stroke="var(--hood-dark)" stroke-width="1.8" stroke-linecap="round" opacity=".25"/>
      <ellipse cx="120" cy="105" rx="53" ry="50" fill="var(--skin)" stroke="var(--hood-dark)" stroke-width="2.2"/>
      <path class="baby-fringe" d="M86 67c6 12-1 23-8 27M120 59c5 14 1 24-7 30M153 67c-5 12 2 23 9 27"/>
      <path class="baby-brow" d="M91 89c6-4 12-3 17 0M132 89c5-3 11-4 17 0"/>
      <g class="baby-eyes-open">
        <ellipse class="baby-eye" cx="99" cy="105" rx="5.3" ry="6.8"/>
        <ellipse class="baby-eye" cx="141" cy="105" rx="5.3" ry="6.8"/>
        <circle class="baby-eye-shine" cx="97.3" cy="102.2" r="1.8"/>
        <circle class="baby-eye-shine" cx="139.3" cy="102.2" r="1.8"/>
        <path d="M90 99 87 96M150 99l3-3" fill="none" stroke="#4f302b" stroke-width="1.7" stroke-linecap="round" opacity=".55"/>
      </g>
      <g class="baby-eyes-closed">
        <path class="eye-closed-arc" d="M89 106c6-8 14-8 20 0"/>
        <path class="eye-closed-arc" d="M131 106c6-8 14-8 20 0"/>
      </g>
      <g class="baby-tears">
        <path class="baby-tear" d="M80 116c-7 10-4 20 3 19 8-1 8-10 2-18Z"/>
        <path class="baby-tear" d="M160 116c7 10 4 20-3 19-8-1-8-10-2-18Z"/>
      </g>
      <g class="baby-cheeks">
        <ellipse cx="74" cy="122" rx="11.5" ry="6.2"/>
        <ellipse cx="166" cy="122" rx="11.5" ry="6.2"/>
        <g class="baby-blush-lines">
          <path d="m69 120 4-2M72 124l4-2M155 118l4 2M152 122l4 2"/>
        </g>
      </g>
      <path class="baby-nose" d="M116 117c2 3 6 3 8 0"/>
      <g class="baby-mouth-idle">
        <path d="M111 131c5 7 13 7 18 0"/>
      </g>
      <g class="baby-mouth-laugh">
        <path class="laugh-mouth" d="M100 126c13-7 28-7 40 0-2 16-10 25-20 26-11-1-19-10-20-26Z"/>
        <path class="laugh-tooth" d="M114 126c4-3 8-3 12 0l-2 6c-3-2-5-2-8 0Z"/>
        <ellipse class="laugh-tongue" cx="120" cy="143" rx="12" ry="6"/>
      </g>
    </g>
    ${accessoryFront}
  </g>
</svg>`;
  }

  function hasPhoto() {
    return Boolean(window.BABY_ASSETS && window.BABY_ASSETS.babyImage);
  }

  function babyMarkup(themeIndex) {
    const theme = THEMES[themeIndex] || THEMES[0];
    if (hasPhoto()) {
      const source = escapeAttribute(window.BABY_ASSETS.babyImage);
      return `<img class="user-baby-image" src="${source}" alt="" draggable="false" data-theme="${theme.id}">`;
    }
    return babySvg(themeIndex);
  }

  function hasLaughAudio() {
    return Boolean(window.BABY_ASSETS && window.BABY_ASSETS.laughAudio);
  }

  window.BabyArt = {
    THEMES,
    LANE_MIDI,
    babySvg,
    babyMarkup,
    hasPhoto,
    hasLaughAudio
  };
})();
