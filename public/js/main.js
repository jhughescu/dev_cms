// public/js/main.js
import {
    initFlashMessages,
    initFlashBanners,
} from "./flash.js";
import {
    initDeleteConfirmation
} from "./delete.js";
import {
    initUploader
} from "./uploader.js";

document.addEventListener("DOMContentLoaded", () => {
    initFlashMessages();
    initFlashBanners();
    initDeleteConfirmation();
    initUploader();
});
