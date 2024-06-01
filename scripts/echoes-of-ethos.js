const moduleID = 'echoes-of-ethos';

const lg = x => console.log(x);

const vmTableIDs = {
    Plus1: 'rcqybsg8XXFapR9I',
    Plus2: 'Ocpnuys9uF6NWVPt',
    Plus3: 'maViN7dK4MTt7IsF',
    Minus1: 'pNTQfMBD7qOv9S2u',
    Minus2: '1SIMlIkutyNCep9m',
    Minus3: '9nQgL4WR2OelAE6A'
};
const actorSheetMap = {
    'systems/dnd5e/templates/actors/character-sheet.hbs': 'legacy',
    'modules/compact-beyond-5e-sheet/templates/character-sheet.hbs': 'compactBeyond',
    'systems/dnd5e/templates/actors/npc-sheet.hbs': 'defaultNPC',
    'systems/dnd5e/templates/actors/character-sheet-2.hbs': 'defaultCharacter',
    'modules/tidy5e-sheet/templates/empty-form-template.hbs': 'tidy5eNPC'
};
let maxThreshold;


Hooks.once('init', () => {
    game.settings.register(moduleID, 'level7Enabled', {
        name: 'Enable Level 7 Morality Threshold',
        scope: 'world',
        config: true,
        type: Boolean,
        default: false,
        onChange: value => {
            maxThreshold = game.settings.get(moduleID, 'moralityThresholds')[value ? 7 : 6];
        }
    });

    game.settings.register(moduleID, 'moralityThresholds', {
        scope: 'world',
        type: Object,
        default: {
            1: 50,
            2: 100,
            3: 170,
            4: 260,
            5: 380,
            6: 500,
            7: 1000
        }
    });

    game.settings.registerMenu(moduleID, 'moralityThresholdMenu', {
        name: 'Morality Thresholds',
        label: 'Configure',
        icon: 'fas fa-cog',
        type: MoralityConfig,
        restricted: true
    });

    game.settings.register(moduleID, 'vmEnabled', {
        name: 'Enable Visible Morality',
        scope: 'world',
        config: true,
        type: Boolean,
        default: false
    });

    game.settings.register(moduleID, 'vmThresholds', {
        scope: 'world',
        type: Object,
        default: {
            1: 100,
            2: 360,
            3: 1000
        }
    });

    game.settings.registerMenu(moduleID, 'vmThresholdMenu', {
        name: 'Visible Morality Thresholds',
        label: 'Configure',
        icon: 'fas fa-cog',
        type: VisibleMoralityConfig,
        restricted: true
    });
});

Hooks.once('ready', () => {
    const level7Enabled = game.settings.get(moduleID, 'level7Enabled');
    maxThreshold = game.settings.get(moduleID, 'moralityThresholds')[level7Enabled ? 7 : 6];
});


Hooks.on('renderActorSheet', (app, [html], appData) => {
    const sheetType = actorSheetMap[app.template];
    const { actor } = app;

    switch (sheetType) {
        case 'legacy':
        case 'defaultNPC': {
            const alignmentLi = html.querySelector('li.alignment');
            const alignmentInput = alignmentLi.querySelector('input');
            alignmentInput.remove();

            const moralityInput = document.createElement('span');
            moralityInput.style.display = 'flex';
            moralityInput.innerHTML = `
                <span>Morality: </span>
                <input type="number" name="flags.${moduleID}.morality" value="${actor.getFlag(moduleID, 'morality') ?? 0}" />
            `;
            alignmentLi.append(moralityInput);
            break;
        }
        case 'compactBeyond': {
            const alignmentInput = html.querySelector('input[name="system.details.alignment"]');
            alignmentInput.previousElementSibling.innerText = 'Morality';

            alignmentInput.name = `flags.${moduleID}.morality`;
            alignmentInput.value = `${actor.getFlag(moduleID, 'morality') ?? 0}`;
            break;
        }
        case 'defaultCharacter': {
            const alignmentLi = html.querySelector('ul.unlist.characteristics').querySelector('li');
            alignmentLi.querySelector('span.label').innerText = 'Morality';
            const isPlayMode = alignmentLi.closest('form').classList.contains('interactable');

            if (isPlayMode) alignmentLi.querySelector('span.value').innerText = actor.getFlag(moduleID, 'morality') ?? 0;
            else {
                html.querySelector('input[name="system.details.alignment"]').remove();

                const moralityInput = document.createElement('input');
                moralityInput.type = 'number';
                moralityInput.name = `flags.${moduleID}.morality`;
                moralityInput.value = actor.getFlag(moduleID, 'morality') ?? 0;
                alignmentLi.appendChild(moralityInput);
            }
        }
    }

    if (!game.settings.get(moduleID, 'vmEnabled')) return;

    const vmFlags = [];
    for (const vmLevel of [1, 2, 3]) {
        const flagData = actor.getFlag(moduleID, `vm${vmLevel}`);
        if (flagData) vmFlags.push(flagData);
    }
    if (!vmFlags.length) return;

    switch (sheetType) {
        case 'legacy': {
            const appearanceTextarea = html.querySelector('textarea[name="system.details.appearance"]');
            appearanceTextarea.disabled = true;
            appearanceTextarea.dataset.tooltip = "This value is being modified by Visible Morality and cannot be edited. Temporarily disable Visible Morality to edit.";

            for (const vm of vmFlags) {
                appearanceTextarea.value += `\n\n${vm}`;
            }
            break;
        }
        case 'defaultNPC': {
            const biography = html.querySelector('div[data-edit="system.details.biography.value"]');
            for (const vm of vmFlags) {
                const v = document.createElement('p');
                v.innerText = vm;
                biography.appendChild(v);
            }
            break;
        }
        case 'compactBeyond': {
            const appearanceDiv = html.querySelector('div[data-edit="system.details.appearance"]');
            for (const vm of vmFlags) {
                const v = document.createElement('p');
                v.innerText = vm;
                appearanceDiv.appendChild(v);
            }
            break;
        }
        case 'defaultCharacter': {
            const appearanceTextarea = html.querySelector('textarea[name="system.details.appearance"]');
            if (appearanceTextarea) {
                appearanceTextarea.disabled = true;
                appearanceTextarea.dataset.tooltip = "This value is being modified by Visible Morality and cannot be edited. Temporarily disable Visible Morality to edit.";

                for (const vm of vmFlags) {
                    appearanceTextarea.value += `\n\n${vm}`;
                }
            } else {
                const appearanceIcon = html.querySelector('i.fas.fa-image-portrait');
                const textbox = appearanceIcon.closest('div.textbox-half');
                const p = textbox.querySelector('p');
                for (const vm of vmFlags) {
                    p.innerText += `\n\n${vm}`;
                }

            }
            break;
        }
        case 'tidy5eNPC': {
            const apperanceNotes = html.querySelector('article.appearance-notes');
            apperanceNotes.querySelector('a.editor-edit').style.display = 'none';

            const appearance = apperanceNotes.querySelector('div[data-edit="flags.tidy5e-sheet.appearance"]');
            for (const vm of vmFlags) {
                const v = document.createElement('p');
                v.innerText = vm;
                appearance.appendChild(v);
            }
            appearance.title = "This value is being modified by Visible Morality and cannot be edited. Temporarily disable Visible Morality to edit.";
            break;
        }
    }
});

Hooks.on('updateActor', updateMorality);

Hooks.on('dnd5e.preRollSkill', (actor, options, skl) => {
    const moralityLevel = actor.getFlag(moduleID, 'moralityLevel');
    if (Math.abs(moralityLevel) !== 7) return;

    const advSkills = moralityLevel > 0 ? ['per', 'ins'] : ['dec', 'int'];
    const disadvSkills = moralityLevel > 0 ? ['dec'] : ['per'];

    if (!advSkills.includes(skl) && !disadvSkills.includes(skl)) return;

    return ui.notifications.info(`Morality ${moralityLevel > 0 ? '+' : '-'}${Math.abs(moralityLevel)} | Roll with ${advSkills.includes(skl) ? 'Advantage' : 'Disadvantage'} `);
});

Hooks.on('renderTidy5eNpcSheet', (app, [html], appData) => {
    const { actor } = app;
    const morality = actor.getFlag(moduleID, 'morality') ?? '0';
    const moralityLabel = html.querySelector('span.origin-summary-text');
    moralityLabel.innerText = `Morality: ${morality}`;
});

Hooks.on('renderActorOriginSummaryConfigFormApplication', (app, [html], appData) => {
    const input = html.querySelector('input[id^="alignment"]');
    input.type = 'number';
    input.value = app.actor.getFlag(moduleID, 'morality');
    const div = input.closest('div');
    const label = div.querySelector('label');
    label.innerText = "Morality";
});

Hooks.on('updateActor', async (actor, diff, options, userID) => {
    if (actor.type !== 'npc') return;
    if (game.user.id !== userID) return;
    if (!('alignment' in (diff.system?.details ?? {}))) return;

    const morality = Number(diff.system.details.alignment);
    return actor.setFlag(moduleID, 'morality', morality);
});

Hooks.on('createToken', (token, context, userID) => {
    const { actor } = token;
    if (actor.type !== 'npc') return;

    return updateVM(actor, 0, true);
});

Hooks.on('createActor', (actor, options, userID) => {
    if (game.user.id !== userID) return;
    if (actor.type !== 'npc') return;

    const alignment = actor.system.details.alignment;
    if (!alignment) return;
    if (Number.isNumeric(alignment)) return;

    let scale, sign;
    if (alignment.includes('Good') || alignment.includes('Evil')) {
        scale = 50;
        sign = alignment.includes('Good') ? 1 : -1;
    } else {
        scale = 2.45;
        sign = Math.round(Math.random()) ? 1 : -1;
    }
    const morality = Math.trunc(sign * actor.system.details.cr * scale);
    return actor.update({
        [`flags.${moduleID}.morality`]: morality
    });
});


async function updateMorality(actor, diff, options, userID) {
    if (game.user.id !== userID) return;
    if (!('morality' in (diff.flags?.[moduleID] ?? {}))) return;

    const oldMoralityLevel = actor.getFlag(moduleID, 'moralityLevel') ?? 0;
    const oldVMLevel = actor.getFlag(moduleID, 'vmLevel') ?? 0;
    const [moralityLevel, vmLevel] = getMoralityLevels(diff.flags[moduleID].morality);
    if (
        (oldMoralityLevel === moralityLevel)
        && (oldVMLevel === vmLevel)
    ) return;

    await actor.setFlag(moduleID, 'moralityLevel', moralityLevel);
    await actor.setFlag(moduleID, 'vmLevel', vmLevel);

    const toDelete = [];
    for (const effect of actor.effects) {
        if (effect.getFlag(moduleID, 'isEoE')) toDelete.push(effect.id);
    }
    await actor.deleteEmbeddedDocuments('ActiveEffect', toDelete);

    if (moralityLevel) await actor.createEmbeddedDocuments('ActiveEffect', [await createMoralityAE(moralityLevel, actor.uuid)]);
    if (oldVMLevel !== vmLevel) return updateVM(actor, oldVMLevel);
}

function getMoralityLevels(morality) {
    if (!morality) return [0, 0];

    const moralityThresholds = game.settings.get(moduleID, 'moralityThresholds');
    const vmThresholds = game.settings.get(moduleID, 'vmThresholds');
    const isPositive = morality > 0;
    morality = Math.abs(morality);

    const res = [];

    for (const [level, threshold] of Object.entries(moralityThresholds)) {
        if (morality < threshold) {
            res.push((level - 1) * (isPositive ? 1 : -1));
            break;
        }
    }
    if (!res.length) res.push((isPositive ? 1 : -1) * (game.settings.get(moduleID, 'level7Enabled') ? 7 : 6));

    for (const [level, threshold] of Object.entries(vmThresholds)) {
        if (morality < threshold) {
            res.push((level - 1) * (isPositive ? 1 : -1));
            break;
        }
    }
    if (res.length === 1) res.push((isPositive ? 1 : -1) * 3);

    return res;
}

async function createMoralityAE(moralityLevel, uuid) {
    const jsonFilename = `morality${moralityLevel > 0 ? 'Plus' : 'Minus'}${Math.abs(moralityLevel)}.json`;
    const jsonFilepath = `modules/${moduleID}/ae/${jsonFilename}`;
    const response = await fetch(jsonFilepath);
    const aeData = await response.json();
    aeData.origin = uuid;
    aeData.flags = {
        [moduleID]: { isEoE: true }
    };
    const moralityAE = new ActiveEffect(aeData);
    return moralityAE;
}

async function updateVM(actor, oldVMLevel, autoRoll = false) {
    if (!game.settings.get(moduleID, 'vmEnabled')) return removeVMFlags(actor);
    if (actor.type === 'npc' && !actor.isToken) return removeVMFlags(actor);

    const vmLevel = actor.getFlag(moduleID, 'vmLevel');
    if (!vmLevel) return removeVMFlags(actor);

    if (Math.sign(vmLevel) !== Math.sign(oldVMLevel)) {
        await removeVMFlags(actor);
        for (let level = 1; level < Math.abs(vmLevel) + 1; level++) {
            await promptVM(actor, level * Math.sign(vmLevel), autoRoll);
        }
    } else if (Math.abs(vmLevel) < Math.abs(oldVMLevel)) {
        for (let level = Math.abs(oldVMLevel); level > Math.abs(vmLevel); level--) {
            await actor.unsetFlag(moduleID, `vm${level}`);
        }
    } else {
        for (let level = Math.abs(oldVMLevel) + 1; level < Math.abs(vmLevel) + 1; level++) {
            await promptVM(actor, level * Math.sign(vmLevel), autoRoll);
        }
    }

    async function removeVMFlags(actor) {
        for (const vmLevel of [1, 2, 3]) {
            const flagData = actor.getFlag(moduleID, `vm${vmLevel}`);
            if (!flagData) continue;

            await actor.unsetFlag(moduleID, `vm${vmLevel}`);
        }
    }

    async function promptVM(actor, vmLevel, autoRoll = false) {
        const user = game.users.find(u => u.character?.id === actor.id) || game.users.find(u => u.isGM && u.active);
        if (!user) return;

        const flagValue = `${vmLevel > 0 ? 'Plus' : 'Minus'}${Math.abs(vmLevel)}`;
        const rollTable = game.tables.find(t => t.getFlag(moduleID, 'vmLevel') === flagValue) || await game.packs.get(`${moduleID}.${moduleID}`).getDocument(vmTableIDs[flagValue]);

        let rollTableResult;
        if (autoRoll) {
            rollTableResult = (await rollTable.draw({ displayChat: false })).results[0].text;
            return actor.setFlag(moduleID, `vm${Math.abs(vmLevel)}`, rollTableResult);
        }

        const buttons = {
        };
        for (const tableResult of rollTable.results.contents) {
            buttons[tableResult.range[0]] = {
                label: tableResult.text,
                callback: () => rollTableResult = tableResult.text
            };
        }
        buttons[0] = {
            label: 'Roll',
            callback: async () => {
                rollTableResult = (await rollTable.draw()).results[0].text;
            }
        };
        await Dialog.wait({
            title: `Visible Morality - ${rollTable.name}`,
            content: `
            <style>
                .vertical-buttons .dialog-buttons {
                    flex-direction: column;
                }
            </style>
            `,
            buttons,
            default: '0',
            close: () => true
        }, { classes: ['vertical-buttons'] });

        if (rollTableResult) return actor.setFlag(moduleID, `vm${Math.abs(vmLevel)}`, rollTableResult);
    }
}


class MoralityConfig extends FormApplication {
    constructor(object, options = {}) {
        super(object, options);

        this.type = 'moralityThresholds';
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            title: 'Morality Thresholds',
            id: `${moduleID}-morality-thresholds`,
            template: `modules/${moduleID}/templates/morality-config.hbs`,
            width: 300,
            height: 'auto',
            submitOnChange: false,
            closeOnSubmit: false
        });
    }

    getData() {
        const data = {};
        const thresholds = game.settings.get(moduleID, this.type);
        data.thresholds = {};
        for (const [level, points] of Object.entries(thresholds)) {
            data.thresholds[level] = points;
        }

        return data;
    }

    activateListeners($html) {
        super.activateListeners($html);

        const html = $html[0];
        const resetButton = html.querySelector('button.reset');
        resetButton.addEventListener('click', async () => {
            let cancel = false;
            await Dialog.confirm({
                content: 'Reset to Default?',
                yes: () => { },
                no: () => cancel = true,
                defaultYes: false
            })
            if (cancel) return;

            const defaultThresholds = game.settings.settings.get(`${moduleID}.${this.type}`).default;
            html.querySelectorAll('input').forEach((input, index) => {
                input.value = defaultThresholds[index + 1];
            });
        });

        html.querySelector('button.save').addEventListener('click', () => {
            const inputs = html.querySelectorAll('input');
            for (let i = 0; i < inputs.length - 1; i++) {
                const current = Number(inputs[i].value);
                const next = Number(inputs[i + 1].value);
                if (current >= next) return ui.notifications.error('Points must be in ascending order.');
            }

            return this.close();
        });
    }

    _updateObject(event, formData) {
        const data = {};
        const fd = Object.values(formData)
        fd.forEach((v, index) => {
            data[index + 1] = v;
        });

        if (this.type === 'moralityThresholds') {
            const level7Enabled = game.settings.get(moduleID, 'level7Enabled');
            maxThreshold = data[level7Enabled ? 7 : 6];
        }
        return game.settings.set(moduleID, this.type, data);
    }
}

class VisibleMoralityConfig extends MoralityConfig {
    constructor(object, options = {}) {
        super(object, options);

        this.type = 'vmThresholds';
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            title: 'Visible Morality Thresholds',
            id: `${moduleID}-visible-morality-thresholds`,
        });
    }

}
