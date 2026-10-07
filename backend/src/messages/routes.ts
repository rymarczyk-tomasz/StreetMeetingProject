const express = require("express");

const messagesDb = require("../db/messages");
const { authenticate } = require("../auth/middleware");

const router = express.Router();

router.use(authenticate);

router.get("/", (req, res) => {
    const messages = messagesDb.listMessagesForUser(req.user.sub).map((row) => ({
        id: row.id,
        subject: row.subject,
        body: row.body,
        createdAt: row.created_at,
        read: Boolean(row.read_at),
    }));
    res.json({ messages, unread: messages.filter((message) => !message.read).length });
});

router.post("/read-all", (req, res) => {
    messagesDb.markAllMessagesRead(req.user.sub);
    res.json({ ok: true });
});

router.post("/:id/read", (req, res) => {
    messagesDb.markMessageRead(Number(req.params.id), req.user.sub);
    res.json({ ok: true });
});

module.exports = router;
