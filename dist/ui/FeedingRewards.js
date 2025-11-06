export class FeedingRewards {
    constructor(canvas) {
        this.stars = [];
        this.memories = [];
        this.isAnimating = false;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }
    async show(ingredient, memoryText) {
        this.stars = [];
        this.memories = [];
        this.isAnimating = true;
        // Get number of stars based on ingredient tier
        const starCount = ingredient.tier;
        // Add stars one by one with delay
        for (let i = 0; i < starCount; i++) {
            await new Promise((resolve) => {
                setTimeout(() => {
                    this.addFloatingStar();
                    resolve();
                }, i * 300); // 300ms between each star
            });
        }
        // Add memory text if provided
        if (memoryText) {
            await new Promise((resolve) => {
                setTimeout(() => {
                    this.addFloatingMemory(memoryText);
                    resolve();
                }, 200); // 200ms after last star
            });
        }
        // Wait for animations to complete
        await new Promise((resolve) => {
            setTimeout(() => {
                this.isAnimating = false;
                if (this.onComplete) {
                    this.onComplete();
                }
                resolve();
            }, 2000); // 2 seconds for animations to finish
        });
    }
    async showMemoryOnly(memoryText) {
        this.stars = [];
        this.memories = [];
        this.isAnimating = true;
        // Add memory text immediately
        this.addFloatingMemory(memoryText);
        // Wait for animation to complete
        await new Promise((resolve) => {
            setTimeout(() => {
                this.isAnimating = false;
                if (this.onComplete) {
                    this.onComplete();
                }
                resolve();
            }, 2000); // 2 seconds for animation to finish
        });
    }
    addFloatingStar() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        // Random offset around center
        const offsetX = (Math.random() - 0.5) * 60;
        const offsetY = (Math.random() - 0.5) * 40;
        this.stars.push({
            x: centerX + offsetX,
            y: centerY + offsetY,
            startTime: Date.now(),
            duration: 1500 // 1.5 seconds animation
        });
    }
    addFloatingMemory(text) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2 + 80;
        this.memories.push({
            text,
            x: centerX,
            y: centerY,
            startTime: Date.now(),
            duration: 2000 // 2 seconds animation
        });
    }
    render() {
        if (!this.isAnimating && this.stars.length === 0 && this.memories.length === 0)
            return;
        this.ctx.save();
        const now = Date.now();
        // Render stars
        const activeStars = this.stars.filter(s => now - s.startTime < s.duration);
        activeStars.forEach((star) => {
            const elapsed = now - star.startTime;
            const progress = elapsed / star.duration;
            // Animation: fade in/out, scale pop, move up
            const alpha = progress < 0.2 ? progress / 0.2 : (progress > 0.8 ? (1 - progress) / 0.2 : 1);
            const offsetY = -progress * 120; // Move up 120px
            // Scale with pop effect
            let scale = 1;
            if (progress < 0.2) {
                scale = 0.3 + (progress / 0.2) * 1.0; // 0.3 -> 1.3
            }
            else if (progress < 0.3) {
                scale = 1.3 - ((progress - 0.2) / 0.1) * 0.3; // 1.3 -> 1.0
            }
            this.ctx.globalAlpha = alpha;
            this.ctx.save();
            this.ctx.translate(star.x, star.y + offsetY);
            this.ctx.scale(scale, scale);
            // Draw star
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('⭐', 0, 0);
            this.ctx.restore();
        });
        // Render memories
        const activeMemories = this.memories.filter(m => now - m.startTime < m.duration);
        activeMemories.forEach((memory) => {
            const elapsed = now - memory.startTime;
            const progress = elapsed / memory.duration;
            // Animation: fade in/out, move up slowly
            const alpha = progress < 0.2 ? progress / 0.2 : (progress > 0.8 ? (1 - progress) / 0.2 : 1);
            const offsetY = -progress * 80; // Move up 80px
            // Scale with subtle pop
            let scale = 1;
            if (progress < 0.15) {
                scale = 0.8 + (progress / 0.15) * 0.3; // 0.8 -> 1.1
            }
            else if (progress < 0.25) {
                scale = 1.1 - ((progress - 0.15) / 0.1) * 0.1; // 1.1 -> 1.0
            }
            this.ctx.globalAlpha = alpha;
            this.ctx.save();
            this.ctx.translate(memory.x, memory.y + offsetY);
            this.ctx.scale(scale, scale);
            // Draw memory text with background
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            const textWidth = this.ctx.measureText(memory.text).width;
            const padding = 12;
            // Background
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(-textWidth / 2 - padding, -12, textWidth + padding * 2, 24);
            // Border
            this.ctx.strokeStyle = '#FFD700';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(-textWidth / 2 - padding, -12, textWidth + padding * 2, 24);
            // Text
            this.ctx.fillStyle = '#FFD700';
            this.ctx.fillText(memory.text, 0, 0);
            this.ctx.restore();
        });
        this.ctx.globalAlpha = 1;
        // Clean up old animations
        this.stars = this.stars.filter(s => now - s.startTime < s.duration + 500);
        this.memories = this.memories.filter(m => now - m.startTime < m.duration + 500);
        this.ctx.restore();
    }
    reset() {
        this.stars = [];
        this.memories = [];
        this.isAnimating = false;
    }
}
