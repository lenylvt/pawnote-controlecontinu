const express = require('express');
const { authenticatePronoteQRCode } = require("pawnote");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/cc', async (req, res) => {
    const { jeton, login, url } = req.query;

    // Parameter validation
    if (!jeton || !login || !url) {
        const missingParams = [
            !jeton ? "jeton" : null,
            !login ? "login" : null,
            !url ? "url" : null
        ].filter(Boolean).join(", ");
        return res.status(400).json({ error: "Missing required parameters", missing: missingParams });
    }

    try {
        const client = await authenticatePronoteQRCode({
            pinCode: process.env.PIN_CODE || "0000",
            dataFromQRCode: { jeton, login, url },
            deviceUUID: process.env.DEVICE_UUID || "default-device-uuid"
        });

        const periods = await client.periods;

        if (periods.length === 0) {
            return res.status(404).json({ message: "No periods found" });
        }

        const baremePoints = {
            "Très bonne maîtrise": 50,
            "Maîtrise satisfaisante": 40,
            "Presque maîtrisé": 30,
            "Maîtrise fragile": 20,
            "Début de maîtrise": 10,
            "Maîtrise insuffisante": 0,
        };

        const pointsByPrefix = {};
        const countByPrefix = {};

        for (const period of periods) {
            const evaluations = await client.getEvaluations(period);
            evaluations.forEach(evaluation => {
                evaluation.skills.forEach(skill => {
                    const prefixes = skill.pillar?.prefixes || [];
                    prefixes.forEach(prefix => {
                        if (prefix !== "") {
                            const points = (baremePoints[skill.level] || 0) * skill.coefficient;
                            pointsByPrefix[prefix] = (pointsByPrefix[prefix] || 0) + points;
                            countByPrefix[prefix] = (countByPrefix[prefix] || 0) + 1;
                        }
                    });
                });
            });
        }

        let totalAveragePoints = 0;
        let totalAveragePointsMin = 0;
        let totalAveragePointsMax = 0;
        const averagePointsByPrefix = {};

        Object.keys(pointsByPrefix).forEach(prefix => {
            const average = pointsByPrefix[prefix] / countByPrefix[prefix];
            const roundedAverage = Math.round(average / 10) * 10;
            const roundedAverageMin = Math.floor(average / 10) * 10;
            const roundedAverageMax = Math.ceil(average / 10) * 10;

            averagePointsByPrefix[prefix] = roundedAverage;
            totalAveragePoints += roundedAverage;
            totalAveragePointsMin += roundedAverageMin;
            totalAveragePointsMax += roundedAverageMax;
        });

        res.json({
            totalAveragePoints,
            totalAveragePointsMin,
            totalAveragePointsMax,
            averagePointsByPrefix,
            details: { pointsByPrefix, countByPrefix }
        });

    } catch (error) {
        console.error('Error during processing:', error);
        res.status(500).json({ error: "Failed to process the request", details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
