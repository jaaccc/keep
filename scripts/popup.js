/*
This file is part of keep.

keep is free software: you can redistribute it and/or modify it under the terms of the GNU General
Public License as published by the Free Software Foundation, either version 3 of the License, or (at
your option) any later version.

keep is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the
implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
License for more details.

You should have received a copy of the GNU General Public License along with keep. If not, see
<https://www.gnu.org/licenses/>. 
*/

const tabsContainer = document.querySelector("#current-tabs");
const savedGroupsContainer = document.querySelector("#saved-groups");
const selectedCount = document.querySelector("#selected-count");
const saveButton = document.querySelector("#save-button");
const deleteButton = document.querySelector("#delete-button");

const tabs = await chrome.tabs.query({});

let selectedGroup = null;

function updateSelectedCount() {
    const selectedTabs = tabsContainer.querySelectorAll(
        'input[type="checkbox"]:checked',
    );

    selectedCount.textContent = `${selectedTabs.length} selected`;
}

for (const tab of tabs) {
    const checkbox = document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.dataset.tabId = tab.id;

    const title = document.createElement("span");

    title.textContent = tab.title;

    const tabRow = document.createElement("label");

    tabRow.classList.add("tab-row");

    tabRow.appendChild(checkbox);
    tabRow.appendChild(title);

    checkbox.addEventListener("change", updateSelectedCount);

    tabsContainer.appendChild(tabRow);
}

if (tabs.length === 0) {
    const emptyMessage = document.createElement("p");

    emptyMessage.classList.add("empty-message");
    emptyMessage.textContent = "no tabs found";

    tabsContainer.appendChild(emptyMessage);
}

saveButton.addEventListener("click", async () => {
    const selectedTabs = tabs.filter((tab) => {
        const checkbox = tabsContainer.querySelector(
            `input[data-tab-id="${tab.id}"]`,
        );

        return checkbox?.checked;
    });

    if (selectedTabs.length === 0) {
        return;
    }

    const savedGroups = await chrome.storage.local.get("groups");
    const groups = savedGroups.groups || [];

    const numbers = groups.map((group) => {
        const match = group.name.match(/^group (\d+)$/);

        return match ? Number(match[1]) : 0;
    });

    const nextNumber = Math.max(0, ...numbers) + 1;

    const group = {
        name: `group ${nextNumber}`,
        tabs: selectedTabs.map((tab) => ({
            title: tab.title,
            url: tab.url,
        })),
    };

    groups.push(group);

    await chrome.storage.local.set({ groups });

    loadSavedGroups();
});

deleteButton.addEventListener("click", async () => {
    if (selectedGroup === null) {
        return;
    }

    const savedGroups = await chrome.storage.local.get("groups");
    const groups = savedGroups.groups || [];

    groups.splice(selectedGroup, 1);

    await chrome.storage.local.set({ groups });

    selectedGroup = null;

    loadSavedGroups();
});

async function loadSavedGroups() {
    const savedGroups = await chrome.storage.local.get("groups");
    const groups = savedGroups.groups || [];

    savedGroupsContainer.replaceChildren();

    if (groups.length === 0) {
        const emptyMessage = document.createElement("p");

        emptyMessage.classList.add("empty-message");
        emptyMessage.textContent = "no saved groups";

        savedGroupsContainer.appendChild(emptyMessage);

        return;
    }

    for (let i = 0; i < groups.length; i++) {
        const group = groups[i];

        const groupContainer = document.createElement("div");

        groupContainer.classList.add("group-container");

        const groupRow = document.createElement("div");

        groupRow.classList.add("group-row");

        const expandButton = document.createElement("span");

        expandButton.classList.add("expand-button");
        expandButton.textContent = "▶";

        const groupName = document.createElement("span");

        groupName.classList.add("group-name");
        groupName.textContent = group.name;

        const tabCount = document.createElement("span");

        tabCount.classList.add("tab-count");
        tabCount.textContent = `${group.tabs.length} tabs`;

        groupRow.appendChild(expandButton);
        groupRow.appendChild(groupName);
        groupRow.appendChild(tabCount);

        const groupTabs = document.createElement("div");

        groupTabs.classList.add("group-tabs");
        groupTabs.hidden = true;

        for (const tab of group.tabs) {
            const tabRow = document.createElement("div");

            tabRow.classList.add("saved-tab");
            tabRow.textContent = tab.title;

            tabRow.addEventListener("click", async () => {
                await chrome.tabs.create({
                    url: tab.url,
                });
            });

            groupTabs.appendChild(tabRow);
        }

        expandButton.addEventListener("click", (event) => {
            event.stopPropagation();

            const expanded = !groupTabs.hidden;

            groupTabs.hidden = expanded;
            expandButton.textContent = expanded ? "▶" : "▼";
        });

        groupRow.addEventListener("click", () => {
            selectedGroup = i;

            document
                .querySelectorAll(".group-row")
                .forEach((row) => row.classList.remove("selected"));

            groupRow.classList.add("selected");
        });

        groupRow.addEventListener("dblclick", () => {
            for (const tab of group.tabs) {
                chrome.tabs.create({
                    url: tab.url,
                });
            }
        });

        groupContainer.appendChild(groupRow);
        groupContainer.appendChild(groupTabs);

        savedGroupsContainer.appendChild(groupContainer);
    }
}

loadSavedGroups();
