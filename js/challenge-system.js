class ChallengeSystem {
    constructor() {
        this.dialogueTextsStatic = [
            "Welcome to Matrix™",
            "More than 4 accounts per device will result in reduced grind!",
            "Good luck!"
        ];
        
        this.dialogueIndex = 0;
        this.typingSpeed = 50;
        this.pauseBetweenLines = 1500;
        this.sevenBeastsDays = [2, 4, 6]; // Tue/Thu/Sat
        this.sevenBeastsWindows = [
            { openH: 9, openM: 0, startH: 9, startM: 30, endH: 10, endM: 30 },
            { openH: 21, openM: 0, startH: 21, startM: 30, endH: 22, endM: 30 }
        ];
        this.yinYangWindows = [
            { levelRange: "Lv30-59", openH: 17, openM: 0, startH: 17, startM: 30, endH: 18, endM: 30 },
            { levelRange: "Lv60-89", openH: 19, openM: 0, startH: 19, startM: 30, endH: 20, endM: 30 },
            { levelRange: "Lv90-130", openH: 21, openM: 0, startH: 21, startM: 30, endH: 22, endM: 30 }
        ];
        
        this.dialogueTexts = this.updateDialogueTexts();
    }
    
    getNow() {
        return new Date();
    }
    
    addDays(date, days) {
        const d = new Date(date);
        d.setUTCDate(d.getUTCDate() + days);
        return d;
    }
    
    getNextDailyUTCDate(hour, minute) {
        const now = this.getNow();
        const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute, 0));
        if (todayUTC > now) return todayUTC;
        else return this.addDays(todayUTC, 1);
    }
    
    formatTimeDiff(diffMs) {
        if (diffMs < 0) return "0 seconds";
        const totalSeconds = Math.floor(diffMs / 1000);
        const days = Math.floor(totalSeconds / (3600 * 24));
        const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        const parts = [];
        if (days > 0) parts.push(days + (days === 1 ? " day" : " days"));
        if (hours > 0) parts.push(hours + (hours === 1 ? " hour" : " hours"));
        if (minutes > 0) parts.push(minutes + (minutes === 1 ? " minute" : " minutes"));
        if (seconds > 0) parts.push(seconds + (seconds === 1 ? " second" : " seconds"));
        
        return parts.slice(0, 3).join(", ") || "0 seconds";
    }
    
    getServerResetDialogue() {
        const nowUTC = this.getNow();
        const nextReset = this.getNextDailyUTCDate(0, 0);
        const diff = nextReset - nowUTC;
        return `Server will reset in ${this.formatTimeDiff(diff)}.`;
    }
    
    getMaintenanceDialogue() {
        const nowUTC = this.getNow();
        const nextMaintenance = this.getNextDailyUTCDate(2, 0);
        const diff = nextMaintenance - nowUTC;
        return `Maintenance in ${this.formatTimeDiff(diff)}.`;
    }
    
    getSevenBeastsDialogues() {
        const now = this.getNow();
        const today = now.getUTCDay();
        
        if (!this.sevenBeastsDays.includes(today)) {
            const nextDay = this.sevenBeastsDays.find(day => day > today) || this.sevenBeastsDays[0];
            const daysUntil = nextDay > today ? nextDay - today : 7 - today + nextDay;
            const nextDate = this.addDays(now, daysUntil);
            const nextOpen = new Date(Date.UTC(nextDate.getUTCFullYear(), nextDate.getUTCMonth(), nextDate.getUTCDate(), 9, 0, 0));
            const diff = nextOpen - now;
            return { text: `Seven Beasts challenge will open in ${this.formatTimeDiff(diff)}.`, color: null };
        }
        
        for (const window of this.sevenBeastsWindows) {
            const open = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), window.openH, window.openM, 0));
            const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), window.startH, window.startM, 0));
            const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), window.endH, window.endM, 0));
            
            if (now < open) {
                const diff = open - now;
                const color = diff <= 30 * 60 * 1000 ? "yellow" : null;
                return { text: `Seven Beasts gate will open in ${this.formatTimeDiff(diff)}.`, color };
            }
            if (now >= open && now < start) {
                const diff = start - now;
                return { text: `Seven Beasts gate has opened for ${this.formatTimeDiff(diff)} — enter now!`, color: "green" };
            }
            if (now >= start && now < end) {
                const diff = end - now;
                return { text: `Seven Beasts challenge is live for ${this.formatTimeDiff(diff)} — gates closed!`, color: "red" };
            }
        }
        
        return { text: "Seven Beasts challenge has ended for today.", color: null };
    }
    
    getYinYangDialogues() {
        const now = this.getNow();
        const dialogues = [];
        
        this.yinYangWindows.forEach(win => {
            const open = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), win.openH, win.openM, 0));
            const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), win.startH, win.startM, 0));
            const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), win.endH, win.endM, 0));
            
            if (now < open) {
                const diff = open - now;
                const color = diff <= 30 * 60 * 1000 ? "yellow" : null;
                dialogues.push({ text: `Yin-Yang Battlefield ${win.levelRange} will open in ${this.formatTimeDiff(diff)}.`, color });
            } else if (now >= open && now < start) {
                const diff = start - now;
                dialogues.push({ text: `Yin-Yang Battlefield ${win.levelRange} is now open for ${this.formatTimeDiff(diff)} — enter now!`, color: "green" });
            } else if (now >= start && now < end) {
                const diff = end - now;
                dialogues.push({ text: `Yin-Yang Battlefield ${win.levelRange} is live for ${this.formatTimeDiff(diff)} — door closed!`, color: "red" });
            }
        });
        
        return dialogues;
    }
    
    updateDialogueTexts() {
        const dialogues = [];
        
        dialogues.push({ text: this.getServerResetDialogue(), color: null });
        dialogues.push({ text: this.getMaintenanceDialogue(), color: null });
        
        const sevenBeasts = this.getSevenBeastsDialogues();
        if (sevenBeasts) dialogues.push(sevenBeasts);
        
        const yinYang = this.getYinYangDialogues();
        dialogues.push(...yinYang);
        
        this.dialogueTextsStatic.forEach(txt => dialogues.push({ text: txt, color: null }));
        
        return dialogues;
    }
    
    typeDialogue() {
        if (this.dialogueIndex >= this.dialogueTexts.length) {
            this.dialogueIndex = 0;
            this.dialogueTexts = this.updateDialogueTexts();
        }
        
        const dialogueTextElem = document.getElementById('dialogue-text');
        if (!dialogueTextElem) return;
        
        const fullHtml = this.dialogueTexts[this.dialogueIndex].text;
        const temp = document.createElement("div");
        temp.innerHTML = fullHtml;
        const plainText = temp.textContent || temp.innerText || "";
        
        const color = this.dialogueTexts[this.dialogueIndex].color;
        if (color) {
            dialogueTextElem.style.color = color === 'green' ? '#51cf66' : color === 'red' ? '#ff6b6b' : color === 'yellow' ? '#ffd43b' : '#ffffff';
        } else {
            dialogueTextElem.style.color = '#ffffff';
        }
        
        dialogueTextElem.textContent = "";
        let charPos = 0;
        
        const typeChar = () => {
            if (charPos < plainText.length) {
                dialogueTextElem.textContent += plainText.charAt(charPos);
                charPos++;
                setTimeout(typeChar, this.typingSpeed);
            } else {
                dialogueTextElem.innerHTML = fullHtml;
                setTimeout(() => {
                    this.dialogueIndex++;
                    this.typeDialogue();
                }, this.pauseBetweenLines);
            }
        };
        
        typeChar();
    }
    
    init() {
        this.typeDialogue();
        // Update dialogues every minute to refresh timers
        setInterval(() => {
            this.dialogueTexts = this.updateDialogueTexts();
        }, 60000);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.challengeSystem = new ChallengeSystem();
    });
} else {
    window.challengeSystem = new ChallengeSystem();
}